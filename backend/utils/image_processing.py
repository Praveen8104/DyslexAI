import cv2
import numpy as np


def validate_handwriting_image(image_path: str) -> tuple[bool, str]:
    """
    Reject images that are clearly not handwriting samples before running analysis.
    Returns (is_valid, error_message).

    Checks (in order):
    1. Readable file + minimum size
    2. Face detection (Haar cascade) — rejects person photos
    3. Color saturation — handwriting is nearly achromatic; photos/posters are colourful
    4. Background brightness — rejects dark-background screenshots/posters
    5. Ink presence — rejects blank pages
    6. Overall dark ratio — rejects densely dark non-handwriting images
    """
    img = cv2.imread(image_path)
    if img is None:
        return False, "Could not read the image file. Please upload a valid JPG or PNG."

    h, w = img.shape[:2]
    if w < 100 or h < 100:
        return False, "Image is too small. Please upload a clear photo of the handwriting sample."

    # ── 1. Face detection ──────────────────────────────────────────────────
    # OpenCV's Haar cascade runs entirely locally — no external AI needed.
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    try:
        face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
        faces = face_cascade.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60)
        )
        if len(faces) > 0:
            return False, (
                "A person's face was detected in the image. "
                "Please upload a photo of handwritten text on plain paper, not a portrait."
            )
    except Exception:
        pass  # If cascade file is unavailable, skip this check rather than crash

    # ── 2. Color saturation ────────────────────────────────────────────────
    # Handwriting on white paper: nearly achromatic → mean HSV saturation ≈ 5–20.
    # Person photos, colourful posters, screenshots: mean saturation >> 30.
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    mean_saturation = float(np.mean(hsv[:, :, 1]))
    if mean_saturation > 35:
        return False, (
            "The image appears to be a photo or colourful graphic, not a handwriting sample. "
            "Please upload a photo of handwritten text on plain white paper."
        )

    # ── 3. Background brightness ───────────────────────────────────────────
    mean_brightness = float(np.mean(gray))
    if mean_brightness < 100:
        return False, (
            "The image appears to have a dark background. "
            "Please upload a photo of handwriting on white or light-coloured paper."
        )

    # ── 4. Ink presence ────────────────────────────────────────────────────
    dark_pixel_ratio = float(np.sum(gray < 128)) / gray.size
    if dark_pixel_ratio < 0.01:
        return False, "No writing detected in the image. Please upload a photo containing handwriting."

    # ── 5. Overall dark ratio ──────────────────────────────────────────────
    if dark_pixel_ratio > 0.60:
        return False, (
            "The image does not appear to be a handwriting sample. "
            "Please upload a photo of handwritten text on plain paper."
        )

    return True, ""


def preprocess_image(image_path: str) -> np.ndarray:
    """Load and preprocess handwriting image."""
    img = cv2.imread(image_path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Enhance contrast using CLAHE (better for pencil/faint writing)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)

    # Adaptive thresholding works better than Otsu for varied lighting/paper texture
    binary = cv2.adaptiveThreshold(
        enhanced, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,
        blockSize=25,
        C=10
    )

    # Remove small noise
    kernel = np.ones((2, 2), np.uint8)
    binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)

    # Remove horizontal ruled lines (notebook paper, exercise books).
    # A horizontal kernel detects structures that are wide but only 1–2px tall —
    # exactly what ruled lines look like after thresholding.
    h_img, w_img = binary.shape
    horiz_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (max(w_img // 8, 40), 1))
    horiz_lines  = cv2.morphologyEx(binary, cv2.MORPH_OPEN, horiz_kernel, iterations=1)
    binary = cv2.subtract(binary, horiz_lines)

    # Remove vertical ruled lines (margin line on lined paper)
    vert_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, max(h_img // 8, 40)))
    vert_lines  = cv2.morphologyEx(binary, cv2.MORPH_OPEN, vert_kernel, iterations=1)
    binary = cv2.subtract(binary, vert_lines)

    # Auto-deskew: detect dominant line angle and rotate to compensate.
    # Even a 3–5° tilt skews baseline and y-centroid comparisons.
    lines = cv2.HoughLinesP(binary, 1, np.pi / 180, threshold=80,
                             minLineLength=50, maxLineGap=10)
    if lines is not None:
        angles = [
            np.degrees(np.arctan2(y2 - y1, x2 - x1))
            for x1, y1, x2, y2 in lines[:, 0]
        ]
        valid_angles = [a for a in angles if abs(a) < 30]
        if valid_angles:
            median_angle = float(np.median(valid_angles))
            if abs(median_angle) > 1.0:
                M = cv2.getRotationMatrix2D((w_img // 2, h_img // 2), median_angle, 1.0)
                binary = cv2.warpAffine(binary, M, (w_img, h_img), borderValue=0)

    return binary


def detect_letter_reversals(binary: np.ndarray) -> int:
    """
    Detect letter reversal patterns using contour asymmetry analysis.
    Lowered thresholds to catch more subtle reversal patterns.
    Returns score 0–4.
    """
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    asymmetry_count = 0
    valid_count = 0

    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < 80:
            continue
        x, y, w, h = cv2.boundingRect(cnt)
        if w < 8 or h < 8 or h > w * 5:
            continue

        valid_count += 1
        roi = binary[y:y+h, x:x+w]
        mid = w // 2
        if mid < 3:
            continue

        left = roi[:, :mid].astype(np.float32)
        right_flipped = cv2.flip(roi[:, mid:mid+mid], 1).astype(np.float32)

        if left.shape == right_flipped.shape:
            diff = cv2.absdiff(left, right_flipped)
            asymmetry = np.sum(diff) / (255.0 * left.size)
            aspect = h / w
            # Raised threshold + aspect guard: reversal-prone letters (b/d/p/q)
            # are roughly square. Very wide or very tall contours are not candidates.
            # Threshold raised 0.30 → 0.42: naturally asymmetric letters (a, g, j, f, r)
            # score 0.30–0.40; genuinely reversed letters score higher.
            # Aspect tightened to 0.6–1.8: b/d/p/q are close to square.
            if asymmetry > 0.42 and 0.6 < aspect < 1.8:
                asymmetry_count += 1

    if valid_count == 0:
        return 0

    ratio = asymmetry_count / valid_count
    if ratio > 0.60:   return 4
    elif ratio > 0.40: return 3
    elif ratio > 0.20: return 2
    elif ratio > 0.08: return 1
    return 0


def detect_spacing_issues(binary: np.ndarray) -> int:
    """
    Detect irregular word/letter spacing.
    Returns score 0–3.
    """
    h_proj = np.sum(binary, axis=0)
    gaps = []
    in_gap = False
    gap_size = 0

    for val in h_proj:
        if val == 0:
            in_gap = True
            gap_size += 1
        else:
            if in_gap and gap_size > 2:
                gaps.append(gap_size)
            in_gap = False
            gap_size = 0

    if len(gaps) < 3:
        return 1   # Too few gaps — likely cramped writing, flag it

    def _cv(arr):
        return np.std(arr) / np.mean(arr) if len(arr) >= 2 and np.mean(arr) > 0 else 0

    # Split gaps into two tiers at the median so word-gaps and letter-gaps
    # are scored separately — mixing them inflates CV on normal writing.
    gaps_arr = np.array(sorted(gaps))
    split = np.median(gaps_arr)
    letter_gaps = gaps_arr[gaps_arr <= split]
    word_gaps   = gaps_arr[gaps_arr > split]
    max_cv = max(_cv(letter_gaps), _cv(word_gaps))

    if max_cv > 1.0:   return 3
    elif max_cv > 0.6: return 2
    elif max_cv > 0.3: return 1
    return 0


def detect_size_inconsistency(binary: np.ndarray) -> int:
    """
    Detect inconsistent letter heights — key dyslexia indicator.
    Returns score 0–3.
    """
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    heights = []
    widths = []

    for cnt in contours:
        if cv2.contourArea(cnt) < 60:
            continue
        _, _, w, h = cv2.boundingRect(cnt)
        # Skip very wide flat contours (ruled line remnants have w >> h)
        if w > 5 and h > 5 and h < binary.shape[0] * 0.5 and h > w * 0.15:
            heights.append(h)
            widths.append(w)

    if len(heights) < 4:
        return 0

    def _cv(arr):
        return np.std(arr) / np.mean(arr) if len(arr) >= 2 and np.mean(arr) > 0 else 0

    # Split heights into two clusters (lowercase body vs uppercase/ascenders)
    # before scoring — mixed-case text naturally has high CV across all heights.
    heights_arr = np.array(sorted(heights))
    mid = len(heights_arr) // 2
    lower_cluster = heights_arr[:mid]
    upper_cluster = heights_arr[mid:]
    max_cv = max(_cv(lower_cluster), _cv(upper_cluster))

    if max_cv > 0.50:   return 3
    elif max_cv > 0.35: return 2
    elif max_cv > 0.18: return 1
    return 0


def detect_baseline_irregularity(binary: np.ndarray) -> int:
    """
    Detect letters going above/below baseline inconsistently.
    Analyses each text line separately — fitting one line across multiple rows
    gives huge residuals even for perfectly regular writing.
    Returns score 0–2.
    """
    lines = segment_lines(binary)

    # Need at least one line with enough contours
    if not lines:
        return 0

    per_line_normalized = []

    for line_binary, _ in lines:
        contours, _ = cv2.findContours(line_binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        x_centers, y_centers, heights = [], [], []

        for cnt in contours:
            if cv2.contourArea(cnt) < 60:
                continue
            x, y, w, h = cv2.boundingRect(cnt)
            if w > 5 and h > 5:
                x_centers.append(x + w // 2)
                y_centers.append(y + h // 2)
                heights.append(h)

        if len(y_centers) < 3:
            continue

        x_arr = np.array(x_centers, dtype=np.float32)
        y_arr = np.array(y_centers, dtype=np.float32)

        coeffs    = np.polyfit(x_arr, y_arr, 1)
        fitted    = np.polyval(coeffs, x_arr)
        residuals = y_arr - fitted

        mean_height = np.mean(heights) if heights else 1.0
        per_line_normalized.append(np.std(residuals) / mean_height)

    if not per_line_normalized:
        return 0

    # Score based on the worst-performing line
    normalized = float(np.mean(per_line_normalized))

    if normalized > 0.5:    return 2
    elif normalized > 0.25: return 1
    return 0


def detect_stroke_width_variance(binary: np.ndarray) -> int:
    """
    Detect inconsistent stroke width (pen pressure variation).
    Uses distance transform: value at each foreground pixel = distance to nearest
    background pixel = local stroke half-width. High CV = inconsistent pressure.
    Returns score 0–2.
    """
    dist = cv2.distanceTransform(binary, cv2.DIST_L2, 5)
    stroke_widths = dist[dist > 0]
    if len(stroke_widths) < 100:
        return 0
    cv = np.std(stroke_widths) / np.mean(stroke_widths)
    if cv > 0.6:    return 2
    elif cv > 0.35: return 1
    return 0


def detect_slant_inconsistency(binary: np.ndarray) -> int:
    """
    Detect inconsistent letter slant angles.
    Fits an ellipse to each letter contour and extracts orientation angle.
    High angle variance = inconsistent slant = dyslexia indicator.
    Returns score 0–2.
    """
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    angles = []
    for cnt in contours:
        if cv2.contourArea(cnt) < 100 or len(cnt) < 5:
            continue
        _, _, angle = cv2.fitEllipse(cnt)
        angles.append(angle)
    if len(angles) < 4:
        return 0
    cv = np.std(angles) / (np.mean(angles) + 1e-6)
    if cv > 0.5:    return 2
    elif cv > 0.25: return 1
    return 0


def segment_lines(binary: np.ndarray) -> list:
    """
    Split binary image into individual text line strips using horizontal
    projection profiling. Returns list of (line_binary, y_offset) tuples.
    """
    h_proj = np.sum(binary, axis=1)
    threshold = np.max(h_proj) * 0.05
    lines = []
    in_line = False
    start = 0
    for i, val in enumerate(h_proj):
        if val > threshold and not in_line:
            start = i
            in_line = True
        elif val <= threshold and in_line:
            if i - start > 10:
                lines.append((binary[start:i, :], start))
            in_line = False
    # Handle line that runs to the bottom edge
    if in_line and len(h_proj) - start > 10:
        lines.append((binary[start:, :], start))
    return lines
