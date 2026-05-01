"""
POST /analyze/letters
Accepts 5 word image uploads (multipart form field: 'files'), runs the CNN
letter-reversal classifier on each word's letter crops, and returns a
structured JSON result.

Word order (fixed): bed, dog, pup, quit, mum
"""

import logging

import cv2
import numpy as np
from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from utils.cnn_model import classify_letter_by_shape, is_model_loaded, predict_letter
from utils.letter_segmentation import segment_word_into_letters

logger = logging.getLogger(__name__)

router = APIRouter()

# ── Constants ─────────────────────────────────────────────────────────────────
WORD_LIST = ["bed", "dog", "pup", "quit", "mum"]
EXPECTED_LETTERS = {"bed": 3, "dog": 3, "pup": 3, "quit": 4, "mum": 3}

MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB


# ── Helper ────────────────────────────────────────────────────────────────────

def _read_upload_as_binary(data: bytes) -> np.ndarray | None:
    """
    Decode raw image bytes, convert to grayscale binary via OpenCV.
    Returns None if decoding fails.
    """
    nparr = np.frombuffer(data, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
    if img is None:
        return None

    # Adaptive threshold to match the preprocessing pipeline used for
    # training (grayscale → CLAHE → adaptive threshold).
    # For canvas images (already clean line art) this is lightweight.
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(img)
    binary = cv2.adaptiveThreshold(
        enhanced, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,
        blockSize=25,
        C=10,
    )
    return binary


def _process_word_image(file_data: bytes, word: str) -> dict:
    """
    Full pipeline for a single word image:
      1. Decode + threshold the canvas PNG directly (no ruled-line removal).
      2. Close small intra-letter gaps.
      3. Segment into letter crops.
      4. Classify each crop.
      5. Return word result dict.

    NOTE: We deliberately skip preprocess_image() here. That function
    contains a vertical-line removal step designed for notebook paper —
    it uses a 1 × 40 px kernel that perfectly matches letter stems
    (b, d, p, q are 80–120 px tall on the canvas) and erases them,
    destroying the asymmetry that the shape classifier relies on.
    Canvas images are already clean (pure white bg, dark strokes) so
    CLAHE + adaptive threshold is all that is needed.
    """
    binary = _read_upload_as_binary(file_data)

    if binary is None:
        return {
            "word": word,
            "letters": [],
            "error": "Could not decode image",
        }

    # ── Close small gaps before segmenting ───────────────────────────────────
    # Canvas drawings consist of separate brush-stroke paths. Morphological
    # closing bridges small intra-letter gaps (humps of 'm', loops of 'b'/'d')
    # without merging adjacent letters (which are typically 20+ px apart).
    try:
        close_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
        binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, close_kernel)
    except Exception:
        pass  # non-fatal; proceed with original binary

    # ── Segment ───────────────────────────────────────────────────────────────
    try:
        segments = segment_word_into_letters(binary)
    except Exception as exc:
        logger.error("Segmentation error for word '%s': %s", word, exc)
        segments = []

    if not segments:
        return {
            "word": word,
            "letters": [],
            "error": "No letters detected in image",
        }

    # ── Trim to expected letter count ─────────────────────────────────────────
    # If closing didn't fully merge all fragments, keep only the N largest
    # segments (by bounding-box area) where N = number of letters in the word.
    # Sort by area descending, keep top N, then re-sort left-to-right by x.
    expected_count = EXPECTED_LETTERS.get(word, len(word))
    if len(segments) > expected_count:
        segments_by_area = sorted(
            segments, key=lambda s: s[1][2] * s[1][3], reverse=True
        )
        segments = segments_by_area[:expected_count]
        segments.sort(key=lambda s: s[1][0])  # restore left-to-right order

    # ── Assign letter labels ───────────────────────────────────────────────────
    word_chars = list(word)
    letter_results = []

    for idx, (crop, _bbox) in enumerate(segments):
        label = word_chars[idx] if idx < len(word_chars) else "?"

        if label != "?":
            # Use projection-peak shape analysis for known reversal-prone letters.
            # If it abstains (peak too central) or the letter is not in the
            # shape-rule set, default to Normal — the CNN was trained on real
            # handwriting datasets and is unreliable on clean canvas drawings.
            prediction = classify_letter_by_shape(crop, label)
            if prediction is None:
                prediction = {'class': 'Normal', 'confidence': 0.50}
        else:
            # Unknown-position fragment: CNN as last resort
            prediction = predict_letter(crop)

        # Debug log — check backend terminal for peak ratios if needed
        if label in ('b', 'd', 'p', 'q', 'm', 'n', 'u', 'w') and crop is not None and crop.size > 0:
            import numpy as _np
            fg = crop > 127
            _h, w = crop.shape[:2]
            col_sums = fg.astype(_np.float64).sum(axis=0)
            row_sums = fg.astype(_np.float64).sum(axis=1)
            peak_c = int(_np.argmax(col_sums))
            peak_r = int(_np.argmax(row_sums))
            logger.info(
                "word=%s pos=%d label=%s crop=%dx%d  "
                "peak_col=%.2f peak_row=%.2f  result=%s",
                word, idx, label, w, crop.shape[0],
                peak_c / max(w - 1, 1),
                peak_r / max(crop.shape[0] - 1, 1),
                prediction,
            )

        letter_results.append({
            "letter":     label,
            "class":      prediction["class"],
            "confidence": prediction["confidence"],
        })

    return {"word": word, "letters": letter_results}


# ── Route ─────────────────────────────────────────────────────────────────────

@router.post("/letters")
async def analyze_letters(
    files: list[UploadFile] = File(..., description="5 word image files in order: bed, dog, pup, quit, mum"),
) -> JSONResponse:
    """
    Analyse 5 handwritten word images for letter reversals using the CNN
    classifier.

    - Expects exactly 5 files (one per word) in order: bed, dog, pup, quit, mum.
    - Each file must be ≤ 5 MB.
    - Returns per-word letter classifications and an overall reversal count.
    """
    # ── Validate file count ───────────────────────────────────────────────────
    if len(files) == 0:
        raise HTTPException(status_code=422, detail="No files uploaded.")

    if len(files) > len(WORD_LIST):
        raise HTTPException(
            status_code=422,
            detail=(
                f"Expected at most {len(WORD_LIST)} files "
                f"({', '.join(WORD_LIST)}), got {len(files)}."
            ),
        )

    # ── Read and validate each file ───────────────────────────────────────────
    file_payloads: list[tuple[bytes, str]] = []

    for idx, upload in enumerate(files):
        word = WORD_LIST[idx]

        # Content-type check (light — canvas export is image/png)
        content_type = upload.content_type or ""
        if content_type and not content_type.startswith("image/"):
            raise HTTPException(
                status_code=422,
                detail=f"File {idx + 1} ('{word}'): expected an image, "
                       f"got content-type '{content_type}'.",
            )

        data = await upload.read()

        if len(data) > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=413,
                detail=(
                    f"File {idx + 1} ('{word}') exceeds the 5 MB size limit "
                    f"({len(data) / 1024 / 1024:.1f} MB uploaded)."
                ),
            )

        if len(data) == 0:
            raise HTTPException(
                status_code=422,
                detail=f"File {idx + 1} ('{word}') is empty.",
            )

        file_payloads.append((data, word))

    # ── Process each word image ───────────────────────────────────────────────
    word_results = []
    reversal_count = 0

    for data, word in file_payloads:
        result = _process_word_image(data, word)
        word_results.append(result)

        # Count reversals across all successfully classified letters
        for letter_info in result.get("letters", []):
            if letter_info.get("class") == "Reversal":
                reversal_count += 1

    # ── Build response ────────────────────────────────────────────────────────
    return JSONResponse(
        content={
            "reversal_count": reversal_count,
            "model_loaded":   is_model_loaded(),
            "words":          word_results,
        }
    )
