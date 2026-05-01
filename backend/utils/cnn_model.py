"""
CNN letter-classification inference using an EfficientNet-B0 ONNX model.

The ONNX session is loaded once at module import time so there is zero
per-request startup cost.  If the model file does not exist yet (still
training) every call returns {'class': 'Unknown', 'confidence': 0.0} and
the route can report model_loaded: false to the frontend without crashing.
"""

import json
import os
import logging

import cv2
import numpy as np

logger = logging.getLogger(__name__)

# ── Paths ─────────────────────────────────────────────────────────────────────
_MODELS_DIR   = os.path.join(os.path.dirname(__file__), "..", "models")
_MODEL_PATH   = os.path.join(_MODELS_DIR, "letter_classifier.onnx")
_MAPPING_PATH = os.path.join(_MODELS_DIR, "class_mapping.json")

# ── ImageNet normalisation constants ─────────────────────────────────────────
_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
_STD  = np.array([0.229, 0.224, 0.225], dtype=np.float32)

# ── Load class mapping ────────────────────────────────────────────────────────
_CLASS_MAP: dict[str, str] = {}
try:
    with open(_MAPPING_PATH, "r") as f:
        _CLASS_MAP = json.load(f)
    logger.info("Letter classifier class mapping loaded: %s", _CLASS_MAP)
except FileNotFoundError:
    logger.warning(
        "class_mapping.json not found at %s — using fallback map.", _MAPPING_PATH
    )
    # Fallback order matches the task description (TBD from training).
    # Will be overridden once the real file is present.
    _CLASS_MAP = {"0": "Corrected", "1": "Normal", "2": "Reversal"}
except Exception as exc:
    logger.error("Failed to load class_mapping.json: %s", exc)
    _CLASS_MAP = {"0": "Corrected", "1": "Normal", "2": "Reversal"}

# ── Load ONNX session ─────────────────────────────────────────────────────────
_session = None
_model_loaded = False

try:
    import onnxruntime as ort  # type: ignore

    if os.path.isfile(_MODEL_PATH):
        _session = ort.InferenceSession(
            _MODEL_PATH,
            providers=["CPUExecutionProvider"],
        )
        _model_loaded = True
        logger.info("Letter classifier ONNX model loaded from %s", _MODEL_PATH)
    else:
        logger.warning(
            "ONNX model not found at %s. "
            "Inference will return 'Unknown' until the model is placed there.",
            _MODEL_PATH,
        )
except ImportError:
    logger.warning(
        "onnxruntime is not installed. "
        "Install it with: pip install onnxruntime"
    )
except Exception as exc:
    logger.error("Failed to load ONNX model: %s", exc)


def is_model_loaded() -> bool:
    """Return True if the ONNX session was initialised successfully."""
    return _model_loaded


def _preprocess(crop: np.ndarray) -> np.ndarray:
    """
    Prepare a grayscale letter crop for EfficientNet-B0 inference.

    Pipeline (must match training preprocessing exactly):
      1. Ensure grayscale (single channel)
      2. Resize to 224 × 224
      3. Replicate to 3 channels (RGB order)
      4. Cast to float32, scale to [0, 1]
      5. Apply ImageNet mean/std normalisation
      6. Transpose to NCHW: (1, 3, 224, 224)
    """
    # ── 1. Grayscale guarantee ────────────────────────────────────────────────
    if crop.ndim == 3:
        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    else:
        gray = crop

    # ── 2. Resize ─────────────────────────────────────────────────────────────
    resized = cv2.resize(gray, (224, 224), interpolation=cv2.INTER_LINEAR)

    # ── 3. Grayscale → 3-channel (H, W, 3) ───────────────────────────────────
    rgb = np.stack([resized, resized, resized], axis=-1)  # shape (224, 224, 3)

    # ── 4. Float32 + scale to [0, 1] ─────────────────────────────────────────
    rgb = rgb.astype(np.float32) / 255.0

    # ── 5. ImageNet normalisation ─────────────────────────────────────────────
    rgb = (rgb - _MEAN) / _STD

    # ── 6. NCHW batch tensor ──────────────────────────────────────────────────
    tensor = rgb.transpose(2, 0, 1)[np.newaxis, ...]  # (1, 3, 224, 224)
    return tensor.astype(np.float32)


# ── Shape-based reversal detection ───────────────────────────────────────────
#
# HORIZONTAL pairs (b/d, p/q) — stem position discriminates:
#   The vertical stem is a full-height stroke → its column dominates the
#   column-sum profile. argmax(col_sums) reliably finds the stem column.
#   Bowl columns have ink at only 20-40% of the height → much lower sums.
#
#   Normal orientation → stem side:
#     b, p → stem LEFT   (bowl right)     b: |)    p: |) with descender
#     d, q → stem RIGHT  (bowl left)      d: (|    q: (| with descender
#
# VERTICAL pairs (m/w, n/u) — arch position discriminates:
#   The connecting arch spans the letter width → its row dominates the
#   row-sum profile. argmax(row_sums) finds the arch row.
#
#   Normal orientation → arch side:
#     m, n → arch TOP    (legs go down)
#     u, w → arch BOTTOM (legs go up)

_HORIZ_RULES: dict[str, str] = {
    'b': 'left',  'd': 'right',
    'p': 'left',  'q': 'right',
}
_VERT_RULES: dict[str, str] = {
    'm': 'top',   'n': 'top',
    'u': 'bottom','w': 'bottom',
}


def _shape_horizontal(crop: np.ndarray, expected_stem_side: str) -> "dict | None":
    """
    Find the column with maximum ink density (the stem column) and check
    whether it is on the expected side.

    Dead-zone is intentionally narrow (±5% of centre) so that only truly
    centred peaks abstain. The caller defaults abstains to Normal rather
    than falling back to CNN (which is unreliable on canvas drawings).
    """
    if crop is None or crop.size == 0:
        return None
    fg = crop > 127
    _h, w = crop.shape[:2]
    if w < 12 or int(fg.sum()) < 30:
        return None

    col_sums = fg.astype(np.float64).sum(axis=0)
    peak_col = int(np.argmax(col_sums))
    r = peak_col / (w - 1)  # 0 = leftmost column, 1 = rightmost

    # Narrow dead-zone: only abstain when peak is within 5% of centre
    if 0.45 < r < 0.55:
        return None

    actual_side = 'left' if r <= 0.45 else 'right'
    confidence  = round(min(0.93, 0.55 + abs(r - 0.5) * 0.76), 4)

    if actual_side == expected_stem_side:
        return {'class': 'Normal',   'confidence': confidence}
    else:
        return {'class': 'Reversal', 'confidence': confidence}


def _shape_vertical(crop: np.ndarray, expected_arch_side: str) -> "dict | None":
    """
    Find the row with maximum ink density (the arch row) and check
    whether it is on the expected side (top / bottom).
    """
    if crop is None or crop.size == 0:
        return None
    fg = crop > 127
    h, _w = crop.shape[:2]
    if h < 12 or int(fg.sum()) < 30:
        return None

    row_sums = fg.astype(np.float64).sum(axis=1)
    peak_row = int(np.argmax(row_sums))
    r = peak_row / (h - 1)  # 0 = top row, 1 = bottom row

    # Same narrow dead-zone as horizontal analysis
    if 0.45 < r < 0.55:
        return None

    actual_side = 'top' if r <= 0.45 else 'bottom'
    confidence  = round(min(0.93, 0.55 + abs(r - 0.5) * 0.76), 4)

    if actual_side == expected_arch_side:
        return {'class': 'Normal',   'confidence': confidence}
    else:
        return {'class': 'Reversal', 'confidence': confidence}


def classify_letter_by_shape(crop: np.ndarray, expected_letter: str) -> "dict | None":
    """
    Detect reversals using projection-profile peak analysis.

    For b/d/p/q  → finds the column-sum peak (= stem position).
    For m/n/u/w  → finds the row-sum peak (= arch position).
    Returns {'class': str, 'confidence': float} or None (caller falls back to CNN).
    """
    letter = expected_letter.lower()
    if letter in _HORIZ_RULES:
        return _shape_horizontal(crop, _HORIZ_RULES[letter])
    if letter in _VERT_RULES:
        return _shape_vertical(crop, _VERT_RULES[letter])
    return None


def predict_letter(crop: np.ndarray) -> dict:
    """
    Run the CNN classifier on a single letter crop.

    Parameters
    ----------
    crop : np.ndarray
        Grayscale (or binary) numpy array of the letter region.

    Returns
    -------
    dict with keys:
        'class'      : str  — one of 'Normal', 'Reversal', 'Corrected', or 'Unknown'
        'confidence' : float — probability of the predicted class (0.0–1.0)
    """
    if not _model_loaded or _session is None:
        return {"class": "Unknown", "confidence": 0.0}

    if crop is None or crop.size == 0:
        return {"class": "Unknown", "confidence": 0.0}

    try:
        tensor = _preprocess(crop)

        input_name  = _session.get_inputs()[0].name
        output_name = _session.get_outputs()[0].name

        raw_output = _session.run([output_name], {input_name: tensor})[0]  # (1, num_classes)

        # Convert logits to probabilities with softmax
        logits = raw_output[0].astype(np.float64)
        # Numerically stable softmax
        logits -= logits.max()
        exp_logits = np.exp(logits)
        probs = exp_logits / exp_logits.sum()

        pred_idx  = int(np.argmax(probs))
        confidence = float(probs[pred_idx])

        class_name = _CLASS_MAP.get(str(pred_idx), f"Class_{pred_idx}")

        return {"class": class_name, "confidence": round(confidence, 4)}

    except Exception as exc:
        logger.error("Letter prediction failed: %s", exc)
        return {"class": "Unknown", "confidence": 0.0}
