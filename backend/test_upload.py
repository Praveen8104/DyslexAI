import requests, wave, struct, os

# Create a small WAV file
with wave.open('test.wav', 'w') as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(16000)
    w.writeframes(struct.pack('<' + 'h'*16000, *[0]*16000))

print("WAV created, size:", os.path.getsize('test.wav'), "bytes")

# Test basic upload
r = requests.post('http://localhost:8000/test-upload', files={'file': open('test.wav', 'rb')})
print("Status:", r.status_code)
print("Response:", r.text)

# Test speech endpoint
r2 = requests.post('http://localhost:8000/analyze/speech', files={'file': open('test.wav', 'rb')})
print("Speech Status:", r2.status_code)
print("Speech Response:", r2.text[:300])
