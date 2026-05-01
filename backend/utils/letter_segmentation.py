import cv2
import numpy as np


def segment_word_into_letters(binary: np.ndarray) -> list:
    """
    Segment a binary word image into individual letter crops.

    Input: numpy binary image (uint8, foreground=255, background=0),
           already preprocessed (deskewed, thresholded).

    Strategy:
    - Find external contours
    - Filter noise by area and aspect ratio
    - Sort left-to-right by x position
    - Handle connected/touching letters by splitting oversized bounding boxes
      using vertical projection profiling

    Returns: list of (letter_crop_np_array, (x, y, w, h)) sorted left-to-right.
             Empty list if no letters are found or input is invalid.
    """
    if binary is None or binary.size == 0:
        return []

    img_h, img_w = binary.shape[:2]
    if img_h < 5 or img_w < 5:
        return []

    # ── Contour detection ────────────────────────────────────────────────────
    contours, _ = cv2.findContours(
        binary.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )

    if not contours:
        return []

    # ── Estimate typical letter dimensions for noise filtering ────────────────
    # Collect raw heights to get a rough median letter height
    raw_heights = [cv2.boundingRect(c)[3] for c in contours]
    if not raw_heights:
        return []
    median_h = float(np.median(raw_heights)) if raw_heights else img_h * 0.3

    # Size thresholds: a letter should be at least 15% of median height
    # and no taller than the full image height (likely not a letter if so).
    min_area = max(20, int(median_h * 0.15) ** 2)
    min_dim  = max(4, int(median_h * 0.10))

    candidates = []
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < min_area:
            continue  # too small — noise dot or punctuation artifact

        x, y, w, h = cv2.boundingRect(cnt)

        # Skip if either dimension is too tiny
        if w < min_dim or h < min_dim:
            continue

        # Skip if extremely wide relative to height — likely a horizontal line
        # remnant or two touching words merged
        if w > img_w * 0.85 and h < median_h * 0.5:
            continue

        # Very wide contour: might be touching letters — try splitting
        # using vertical projection profiling
        if w > median_h * 2.5 and h > median_h * 0.4:
            splits = _split_touching_letters(binary, x, y, w, h, median_h)
            if splits:
                candidates.extend(splits)
                continue

        candidates.append((x, y, w, h))

    if not candidates:
        return []

    # ── Sort left-to-right ────────────────────────────────────────────────────
    candidates.sort(key=lambda r: r[0])

    # ── Build output ──────────────────────────────────────────────────────────
    results = []
    for x, y, w, h in candidates:
        # Clamp to image bounds with a small padding
        pad = 2
        x0 = max(0, x - pad)
        y0 = max(0, y - pad)
        x1 = min(img_w, x + w + pad)
        y1 = min(img_h, y + h + pad)

        crop = binary[y0:y1, x0:x1]
        if crop.size == 0:
            continue

        results.append((crop, (x, y, w, h)))

    return results


def _split_touching_letters(
    binary: np.ndarray, x: int, y: int, w: int, h: int, median_h: float
) -> list:
    """
    Try to split a wide bounding box (likely touching letters) into
    sub-segments using vertical projection profiling on the cropped region.

    Returns list of (x, y, w, h) tuples, or empty list if splitting fails
    (caller will fall back to using the original bounding box).
    """
    try:
        roi = binary[y: y + h, x: x + w]
        if roi.size == 0:
            return []

        # Vertical projection: sum of foreground pixels per column
        v_proj = np.sum(roi, axis=0)

        # Find valley columns (low ink density) — these are likely split points
        threshold = np.max(v_proj) * 0.08  # columns below 8% of peak are valleys
        in_letter = False
        letter_start = 0
        splits = []

        for col_idx, val in enumerate(v_proj):
            if val > threshold and not in_letter:
                letter_start = col_idx
                in_letter = True
            elif val <= threshold and in_letter:
                seg_w = col_idx - letter_start
                if seg_w >= 4:  # minimum plausible letter width
                    splits.append((x + letter_start, y, seg_w, h))
                in_letter = False

        # Handle segment running to right edge
        if in_letter:
            seg_w = w - letter_start
            if seg_w >= 4:
                splits.append((x + letter_start, y, seg_w, h))

        # Only accept the split if it produced more than one segment
        # and didn't just return the same single blob
        if len(splits) <= 1:
            return []

        return splits

    except Exception:
        return []
