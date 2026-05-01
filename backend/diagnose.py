import soundfile as sf
import numpy as np
import os

# Step 1: Can we write a file to the backend folder?
test_path = r"C:\Users\abc'\Praveen\dyslexia-detector\backend\uploads\speech_upload.wav"
os.makedirs(os.path.dirname(test_path), exist_ok=True)

import wave, struct
with wave.open(test_path, 'w') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(16000)
    w.writeframes(struct.pack('<' + 'h'*16000, *[0]*16000))
print(f"[1] WAV written to: {test_path}, size: {os.path.getsize(test_path)}")

# Step 2: Can soundfile read it?
data, sr = sf.read(test_path, dtype="float32")
print(f"[2] soundfile read OK: {len(data)} samples, {sr}Hz")

# Step 3: Can faster-whisper transcribe numpy?
from faster_whisper import WhisperModel
model = WhisperModel("base", device="cpu", compute_type="int8")
print("[3] Model loaded")

segments, _ = model.transcribe(data, beam_size=5)
transcription = " ".join(s.text for s in segments).strip()
print(f"[4] Transcription: '{transcription}'")

# Step 4: Can count_pauses run?
from utils.audio_processing import count_pauses
pauses = count_pauses(test_path)
print(f"[5] Pauses: {pauses}")

print("\nALL STEPS PASSED")
