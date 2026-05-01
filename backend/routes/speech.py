import os
import tempfile
import traceback
import numpy as np
import soundfile as sf
from dotenv import load_dotenv
from groq import Groq
from fastapi import APIRouter, File, Form, UploadFile, HTTPException
from typing import Optional
from utils.audio_processing import (
    count_pauses, calculate_wer, count_repetitions,
    count_phoneme_errors, score_reading_speed, score_wer,
    score_pauses, score_repetitions, score_phoneme_errors,
    check_audio_quality, is_hallucination, wpm_is_reliable,
)

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

MAX_AUDIO_BYTES = 50 * 1024 * 1024  # 50 MB

router = APIRouter()
groq_client = Groq(api_key=os.environ["GROQ_API_KEY"])


@router.post("/speech")
async def analyze_speech(
    file: UploadFile = File(...),
    browser_transcript: Optional[str] = Form(None),
):
    tmp_path = None
    try:
        # Write upload to a unique temp file — safe for concurrent requests.
        # Use the correct extension so soundfile can auto-detect the format.
        audio_bytes = await file.read()
        if len(audio_bytes) > MAX_AUDIO_BYTES:
            raise HTTPException(status_code=413, detail="Audio file is too large. Maximum allowed size is 50 MB.")

        content_type = file.content_type or "audio/wav"
        ext = ".ogg" if "ogg" in content_type else ".mp4" if "mp4" in content_type else ".wav"
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        # Validate audio quality before any transcription attempt.
        is_valid, quality_error = check_audio_quality(tmp_path)
        if not is_valid:
            raise HTTPException(status_code=422, detail=quality_error)

        # ── Transcription source decision ──────────────────────────────────
        # If the browser's SpeechRecognition already produced a valid transcript,
        # use it directly — skips Whisper and avoids hallucination/garbling issues
        # that occur when Groq can't decode certain accents or mic encodings.
        # Whisper is used as fallback when no browser transcript is available.

        using_browser_transcript = bool(
            browser_transcript and
            browser_transcript.strip() and
            not is_hallucination(browser_transcript)
        )

        if using_browser_transcript:
            transcription = browser_transcript.strip()
        else:
            # Transcribe with Groq Whisper Large v3
            with open(tmp_path, "rb") as audio_file:
                result = groq_client.audio.transcriptions.create(
                    model="whisper-large-v3",
                    file=audio_file,
                    response_format="text",
                    language="en",
                )
            transcription = result.strip() if isinstance(result, str) else result.text.strip()

            # Sanity check Whisper output for hallucinations.
            # When rejecting, prefer the browser transcript in "What was heard" —
            # it's more accurate than Whisper's garble and avoids showing two
            # conflicting transcriptions to the user.
            if is_hallucination(transcription):
                heard = (
                    browser_transcript.strip()
                    if browser_transcript and browser_transcript.strip()
                    else transcription[:200]
                )
                raise HTTPException(
                    status_code=422,
                    detail={
                        "message": (
                            "The transcription does not match the Rainbow Passage. "
                            "Please read the passage shown on screen in a quiet environment and re-record."
                        ),
                        "transcribed": heard,
                        "tips": [
                            "Read the passage exactly as shown — do not substitute words.",
                            "Record in a quiet room with no background noise.",
                            "Hold the microphone close and speak clearly.",
                            "Ensure your browser microphone permission is set to the correct device.",
                        ]
                    }
                )

        # Compute duration for WPM
        audio_data, sample_rate = sf.read(tmp_path, dtype="float32")
        if audio_data.ndim > 1:
            audio_data = audio_data.mean(axis=1)
        duration_seconds = len(audio_data) / sample_rate

        words_per_minute    = round(len(transcription.split()) / max(duration_seconds / 60, 0.01))
        wer_percent         = calculate_wer(transcription)
        pause_count         = count_pauses(tmp_path)
        repetition_count    = count_repetitions(transcription)
        phoneme_error_count = count_phoneme_errors(transcription)

        speed_score = score_reading_speed(words_per_minute, wer_percent)
        reliable    = wpm_is_reliable(wer_percent)

        total_score = (
            speed_score +
            score_wer(wer_percent) +
            score_pauses(pause_count) +
            score_repetitions(repetition_count) +
            score_phoneme_errors(phoneme_error_count)
        )

        return {
            "total_score": total_score,
            "transcription": transcription,
            "transcript_source": "browser" if using_browser_transcript else "whisper",
            "indicators": {
                "words_per_minute":    words_per_minute,
                "wpm_reliable":        reliable,
                "wer_percent":         wer_percent,
                "pause_count":         pause_count,
                "repetition_count":    repetition_count,
                "phoneme_errors":      phoneme_error_count,
                "speed_score":         speed_score,
                "wer_score":           score_wer(wer_percent),
                "pause_score":         score_pauses(pause_count),
            },
            "message": "Speech analysis complete."
        }

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Speech analysis error: {str(e)}")

    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)
