import numpy as np
import soundfile as sf
import jiwer
import jellyfish
import re

REFERENCE_PASSAGE = (
    "when the sunlight strikes raindrops in the air they act as a prism and form a rainbow "
    "the rainbow is a division of white light into many beautiful colors "
    "these take the shape of a long round arch with its path high above and its two ends apparently beyond the horizon"
)


def load_audio(audio_path: str):
    """Load audio using soundfile (no ffmpeg needed). Returns (samples, sample_rate)."""
    data, samplerate = sf.read(audio_path, dtype="float32")
    # Convert stereo to mono
    if data.ndim > 1:
        data = data.mean(axis=1)
    return data, samplerate


def check_audio_quality(audio_path: str) -> tuple[bool, str]:
    """
    Validate audio before sending to Whisper.
    Whisper hallucinates ('Assalamu alaikum', 'Thank you for watching') on
    silent or very short recordings.
    Returns (is_valid, error_message).
    """
    data, sr = load_audio(audio_path)
    duration = len(data) / sr

    # Rainbow Passage takes at least 15s at any reasonable reading pace.
    if duration < 8.0:
        return False, f"Recording is too short ({duration:.1f}s). Please read the full passage aloud."

    # Check RMS energy — silent recordings trigger Whisper hallucinations.
    rms = float(np.sqrt(np.mean(data ** 2)))
    if rms < 0.005:
        return False, "No speech detected in the recording. Please check your microphone and re-record."

    # Check what fraction of frames have meaningful speech energy.
    frame_size = int(sr * 0.025)
    speech_frames = 0
    total_frames = 0
    for start in range(0, len(data) - frame_size, frame_size):
        frame_rms = np.sqrt(np.mean(data[start:start + frame_size] ** 2))
        if frame_rms > 0.01:
            speech_frames += 1
        total_frames += 1

    if total_frames == 0 or (speech_frames / total_frames) < 0.20:
        return False, "Recording appears to be mostly silence. Please speak clearly and re-record."

    return True, ""


_STOPWORDS = {
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "as", "is", "it", "its", "be", "by", "from", "that",
    "this", "they", "their", "into", "are", "was", "were", "has", "have",
    "had", "not", "no", "so", "if", "my", "we", "you", "he", "she", "i",
    "me", "him", "her", "us", "do", "did", "does", "will", "would", "can",
    "could", "may", "might", "shall", "should", "up", "out", "about",
    "than", "then", "when", "there", "these", "those", "which", "what",
    "who", "how", "all", "each", "both", "through", "during", "before",
    "after", "above", "below", "between", "own", "same", "also",
}


def is_hallucination(transcription: str) -> bool:
    """
    Detect Whisper hallucinations by checking content-word overlap with the reference.
    Stopwords ('for', 'the', 'and') are excluded — they appear in any English text
    and inflate the overlap ratio for short hallucinated phrases like
    'Thanks for watching' or 'Assalamu alaikum'.
    Near-zero content-word overlap = hallucinated output.
    """
    def content_words(text: str) -> set:
        words = re.sub(r'[^\w\s]', '', text.lower()).split()
        return {w for w in words if w not in _STOPWORDS and len(w) > 2}

    ref_content = content_words(REFERENCE_PASSAGE)
    hyp_content = content_words(transcription)

    if not hyp_content:
        return True

    overlap = len(ref_content & hyp_content) / len(hyp_content)
    # Less than 20% content-word overlap = almost certainly not the passage
    return overlap < 0.20


def get_audio_duration(audio_path: str) -> float:
    """Return duration of audio file in seconds."""
    data, sr = load_audio(audio_path)
    return len(data) / sr


def count_pauses(audio_path: str, min_silence_duration: float = 0.5) -> int:
    """
    Count significant pauses in speech using RMS energy.

    Threshold = mean − 1.5σ (floored at 0.01) instead of the 20th-percentile.
    The percentile adapts per recording — a consistently quiet speaker and a
    hesitant speaker get the same threshold, which over-counts pauses for quiet
    speakers and under-counts for hesitant ones.  An absolute threshold anchored
    to the recording's own energy level is more stable.
    """
    data, sr = load_audio(audio_path)

    frame_size = int(sr * 0.025)   # 25ms frames
    hop_size   = int(sr * 0.010)   # 10ms hop

    rms_frames = []
    for start in range(0, len(data) - frame_size, hop_size):
        frame = data[start: start + frame_size]
        rms_frames.append(np.sqrt(np.mean(frame ** 2)))

    rms = np.array(rms_frames)

    # Absolute threshold: mean − 1.5σ, floored so a near-silent room
    # doesn't produce a threshold of zero and flag every frame.
    threshold  = max(float(np.mean(rms) - 1.5 * np.std(rms)), 0.01)
    min_frames = int(min_silence_duration / 0.010)

    pause_count   = 0
    silent_frames = 0
    in_silence    = False

    for r in rms:
        if r < threshold:
            silent_frames += 1
            in_silence = True
        else:
            if in_silence and silent_frames >= min_frames:
                pause_count += 1
            silent_frames = 0
            in_silence    = False

    return pause_count


def calculate_wer(hypothesis: str) -> float:
    """Calculate Word Error Rate between transcription and reference passage."""
    ref = re.sub(r'[^\w\s]', '', REFERENCE_PASSAGE.lower().strip())
    hyp = re.sub(r'[^\w\s]', '', hypothesis.lower().strip())
    if not hyp:
        return 100.0
    try:
        return round(jiwer.wer(ref, hyp) * 100, 1)
    except Exception:
        return 0.0


def count_repetitions(text: str) -> int:
    """Count repeated consecutive words."""
    words = text.lower().split()
    return sum(1 for i in range(1, len(words)) if words[i] == words[i - 1])


def count_phoneme_errors(hypothesis: str) -> int:
    """
    Count phoneme substitution errors using Soundex comparison.

    Uses difflib.SequenceMatcher to align ref and hyp before comparing —
    positional indexing (ref[i] vs hyp[i]) breaks when the user skips or
    inserts a word, shifting every subsequent comparison to the wrong pair.
    SequenceMatcher finds the best alignment and only compares matched pairs.
    """
    import difflib
    ref_words = REFERENCE_PASSAGE.lower().split()
    hyp_words = re.sub(r'[^\w\s]', '', hypothesis.lower()).split()

    matcher = difflib.SequenceMatcher(None, ref_words, hyp_words)
    errors = 0
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "replace":
            # Compare aligned pairs; leftover words on either side count as errors
            for r, h in zip(ref_words[i1:i2], hyp_words[j1:j2]):
                if jellyfish.soundex(r) != jellyfish.soundex(h):
                    errors += 1
            # Unmatched tail words are substitution errors too
            errors += abs((i2 - i1) - (j2 - j1))
    return errors


def score_reading_speed(wpm: float, wer_percent: float = 0.0) -> int:
    """
    Score reading speed (WPM).
    When WER > 50 % the word count from the transcript is unreliable
    (many substitutions / deletions skew it), so WPM is not scored.
    """
    if wer_percent > 50:
        return 0   # unreliable — don't penalise
    if wpm < 70:   return 2
    if wpm < 100:  return 1
    return 0


def wpm_is_reliable(wer_percent: float) -> bool:
    """Returns False when WER is so high that WPM cannot be trusted."""
    return wer_percent <= 50


def score_wer(wer_percent: float) -> int:
    if wer_percent > 35:  return 3
    if wer_percent > 20:  return 2
    if wer_percent > 10:  return 1
    return 0


def score_pauses(pause_count: int) -> int:
    if pause_count > 12:  return 2
    if pause_count > 6:   return 1
    return 0


def score_repetitions(rep_count: int) -> int:
    if rep_count > 5:  return 2
    if rep_count > 2:  return 1
    return 0


def score_phoneme_errors(error_count: int) -> int:
    return 1 if error_count > 10 else 0
