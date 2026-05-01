import os
import tempfile
import traceback
from fastapi import APIRouter, File, UploadFile, HTTPException
from utils.image_processing import (
    validate_handwriting_image,
    preprocess_image,
    detect_letter_reversals,
    detect_spacing_issues,
    detect_size_inconsistency,
    detect_baseline_irregularity,
    detect_stroke_width_variance,
    detect_slant_inconsistency,
)

router = APIRouter()


MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB

@router.post("/handwriting")
async def analyze_handwriting(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")

    contents = await file.read()
    if len(contents) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image is too large. Maximum allowed size is 10 MB.")

    suffix = os.path.splitext(file.filename)[1] or ".jpg"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(contents)
        tmp_path = tmp.name

    try:
        is_valid, img_error = validate_handwriting_image(tmp_path)
        if not is_valid:
            raise HTTPException(status_code=422, detail=img_error)

        binary = preprocess_image(tmp_path)

        reversal_score    = detect_letter_reversals(binary)
        spacing_score     = detect_spacing_issues(binary)
        size_score        = detect_size_inconsistency(binary)
        baseline_score    = detect_baseline_irregularity(binary)
        stroke_score      = detect_stroke_width_variance(binary)
        slant_score       = detect_slant_inconsistency(binary)

        total_score = (
            reversal_score + spacing_score + size_score +
            baseline_score + stroke_score + slant_score
        )

        return {
            "total_score": total_score,
            "indicators": {
                "reversal_score":  reversal_score,
                "spacing_score":   spacing_score,
                "size_score":      size_score,
                "baseline_score":  baseline_score,
                "stroke_score":    stroke_score,
                "slant_score":     slant_score,
            },
            "message": "Handwriting analysis complete."
        }
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
