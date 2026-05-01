# DyslexiaDetect — AI-Powered Dyslexia Screening Tool

> A multimodal web application that analyzes handwriting images and speech recordings to detect early signs of dyslexia using computer vision and speech analysis.

**Status:** ✅ Production-Ready | **Type:** JNTUK Final Year Project | **Purpose:** Preliminary screening tool (not a clinical diagnosis)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [How to Run](#how-to-run)
- [Feature Details](#feature-details)
  - [Handwriting Analysis](#handwriting-analysis)
  - [Letter Recognition](#letter-recognition)
  - [Speech Analysis](#speech-analysis)
- [Scoring System](#scoring-system)
- [API Documentation](#api-documentation)
- [Known Issues](#known-issues)
- [Future Work](#future-work)

---

## Overview

**DyslexiaDetect** is an AI-powered preliminary screening tool designed to identify early indicators of dyslexia through:

1. **Handwriting Image Analysis** — detects letter reversals, spacing irregularities, size inconsistencies, baseline deviation, stroke width variance, and slant issues
2. **Letter Reversal Classification** — uses a CNN model trained on the Kaggle dyslexia handwriting dataset to classify letters as Normal, Reversed, or Corrected
3. **Speech Analysis** — evaluates reading fluency, word error rate, phoneme accuracy, and speech patterns against the Rainbow Passage reference

The application generates a combined risk score and provides a downloadable PDF report of findings.

---

## Features

### ✅ Currently Working

- **Handwriting Upload** — Validates and analyzes handwriting images (rejects photos, colorful graphics, blank pages)
- **Image Preprocessing** — Auto-deskew, CLAHE contrast enhancement, adaptive thresholding
- **6 Handwriting Detectors** — Letter reversals, spacing, size, baseline, stroke width, slant inconsistency
- **CNN Letter Classifier** — Identifies reversed vs normal letters (EfficientNet-B0 trained on Kaggle dataset)
- **Speech Recording** — RecordRTC with 16kHz mono WAV encoding
- **Live Transcription** — Web Speech API real-time transcript display (Chrome/Edge only)
- **Whisper Fallback** — Groq Whisper Large v3 with hallucination detection
- **5 Speech Metrics** — Reading speed (WPM), word error rate, pause count, repetitions, phoneme errors
- **Radar Chart Visualization** — 6 handwriting + 3 speech axes
- **PDF Export** — Downloadable report with results and visualizations
- **Test History** — Last 20 tests saved in localStorage
- **Dark/Light Mode** — Theme toggle

---

## Tech Stack

### Frontend
- **React.js** 19.2.4 — UI framework
- **React Router** 7.14 — client-side routing
- **Tailwind CSS** 3 — utility-first styling
- **Recharts** 3.8.1 — Radar chart visualization
- **Axios** 1.15 — API client
- **jsPDF** 4.2.1 — PDF report generation
- **RecordRTC** 5.6.2 — browser audio recording
- **React Dropzone** 15.0 — file upload widget

### Backend
- **Python 3.10+** — runtime
- **FastAPI** — web framework
- **Uvicorn** — ASGI server
- **OpenCV** (opencv-python-headless) — image processing
- **NumPy** — numerical computing
- **Pillow** — image handling
- **ONNX Runtime** — CNN inference (letter classification)
- **Groq API** — Whisper v3 speech transcription
- **jiwer** — word error rate calculation
- **jellyfish** — phoneme comparison (Soundex)
- **SoundFile** — WAV audio reading

---

## Project Structure

```
dyslexia-detector/
├── backend/
│   ├── main.py                    # FastAPI app, CORS, routes setup
│   ├── diagnose.py                # Debug utility
│   ├── requirements.txt            # Python dependencies
│   ├── render.yaml                 # Deployment config
│   ├── .env                        # GROQ_API_KEY (not committed)
│   │
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── handwriting.py          # POST /analyze/handwriting
│   │   ├── letters.py              # POST /analyze/letters
│   │   └── speech.py               # POST /analyze/speech
│   │
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── image_processing.py     # 6 handwriting feature detectors + validation
│   │   ├── letter_segmentation.py  # Extract letter crops from word images
│   │   ├── cnn_model.py            # ONNX model loader + inference
│   │   └── audio_processing.py     # Speech scoring + hallucination detection
│   │
│   ├── models/
│   │   ├── letter_classifier.onnx  # Trained EfficientNet-B0 (15.29 MB)
│   │   └── class_mapping.json      # Class index → label map
│   │
│   └── uploads/                    # Temporary upload storage
│
├── frontend/
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   │
│   ├── public/
│   │   └── index.html
│   │
│   └── src/
│       ├── App.jsx                 # Router + ThemeProvider
│       ├── index.js                # React entry point
│       │
│       ├── api/
│       │   └── index.js            # Axios API client (BASE_URL: localhost:8000)
│       │
│       ├── context/
│       │   └── ThemeContext.jsx    # Dark/light mode state
│       │
│       ├── components/
│       │   ├── Navbar.jsx          # Navigation + theme toggle
│       │   ├── StepHandwriting.jsx # Dropzone + image analysis
│       │   ├── StepLetters.jsx     # Canvas drawing + CNN inference
│       │   └── StepSpeech.jsx      # RecordRTC + live transcript
│       │
│       └── pages/
│           ├── Home.jsx            # Landing page
│           ├── Test.jsx            # 4-step test flow
│           ├── Results.jsx         # Radar chart + per-module breakdown + PDF export
│           ├── History.jsx         # Past test results
│           ├── About.jsx           # Dyslexia info page
│           ├── HandwritingTest.jsx # Dedicated handwriting page
│           └── SpeechTest.jsx      # Dedicated speech page
│
└── README.md                       # This file
```

---

## Getting Started

### Prerequisites

- **Python 3.10+** with pip
- **Node.js 16+** with npm
- **Groq API Key** (get free at https://console.groq.com)
- Modern browser (Chrome/Edge for live transcription, Firefox works with Whisper fallback)

### Installation

#### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/Scripts/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file with Groq API key
echo "GROQ_API_KEY=your_groq_api_key_here" > .env
```

#### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install
```

---

## How to Run

### Start Backend

```bash
cd backend
source venv/Scripts/activate  # Activate virtual environment

python -m uvicorn main:app --port 8000
```

Backend will be available at `http://localhost:8000`

### Start Frontend

```bash
cd frontend

npm start
```

Frontend will open at `http://localhost:3000`

### Test the Application

1. **Home Page** — Learn about the app
2. **Take Test** → **Handwriting** — Upload an image of handwriting
3. **Letters** — Draw 5 diagnostic words on canvas (bed, dog, pup, quit, mum)
4. **Speech** — Record yourself reading the Rainbow Passage
5. **Results** — View radar chart, scores, and download PDF report

---

## Feature Details

### Handwriting Analysis

#### Image Validation

Before analysis, images are validated to reject:
- **Person photos** — Haar cascade face detection
- **Colorful graphics** — HSV saturation threshold (> 35)
- **Dark backgrounds** — Grayscale brightness check
- **Blank pages** — Dark pixel ratio analysis
- **Low-quality scans** — Combined dark pixel density

#### Preprocessing Pipeline

1. **Grayscale conversion** — Remove color channels
2. **CLAHE enhancement** — Local contrast improvement (avoids washing out faint strokes)
3. **Adaptive thresholding** — Handle uneven lighting (Gaussian neighborhood-based)
4. **Morphological cleaning** — Remove noise (MORPH_OPEN with 2×2 kernel)
5. **Auto-deskew** — Detect and correct tilt using HoughLinesP (median angle method)

#### Feature Detectors (0–16 max score)

| Indicator | Method | Score | What it detects |
|---|---|---|---|
| **Letter Reversals** | Contour asymmetry (0.30 threshold, aspect guard 0.5–2.0) | 0–4 | Mirror-flipped letters (b↔d, p↔q) |
| **Spacing Issues** | Two-tier gap CV (letter vs word gaps at median split) | 0–3 | Inconsistent spacing between letters/words |
| **Size Inconsistency** | Clustered height CV (lowercase vs uppercase) | 0–3 | Varying letter sizes |
| **Baseline Deviation** | Polyfit residual / mean height (tilt-invariant) | 0–2 | Letters rising/falling from baseline |
| **Stroke Width** | Distance transform CV | 0–2 | Inconsistent pen pressure |
| **Slant Variance** | fitEllipse angle CV | 0–2 | Varying letter lean angles |

---

### Letter Recognition (Phase 3 - CNN)

#### Diagnostic Words

Users draw 5 words on a canvas for per-letter analysis:
- **bed** — common reversals
- **dog** — checks d letter
- **pup** — p and u assessment
- **quit** — u, i, t assessment
- **mum** — m and u consistency

#### CNN Model

- **Architecture** — EfficientNet-B0 (fine-tuned on ImageNet)
- **Classes** — 26 letters × 3 states (Normal, Reversed, Corrected)
- **Training Data** — Kaggle Dyslexia Handwriting Dataset
- **Export Format** — ONNX (15.29 MB)
- **Inference** — ONNX Runtime (CPU-based, no GPU required)

#### Letter Segmentation

Per word:
1. Find contours (connected components)
2. Sort left→right by x-coordinate
3. Crop each letter ROI
4. Resize to 224×224 (EfficientNet input size)
5. Pass to CNN for classification

#### Results Display

- Per-letter confidence scores (Normal % vs Reversed % vs Corrected %)
- Word-level reversal count
- Summary card showing reversal patterns

---

### Speech Analysis

#### Recording & Transcription

**Browser Flow:**
1. RecordRTC captures audio at 16kHz mono WAV
2. Web Speech API (`SpeechRecognition`) provides live transcript display (Chrome/Edge only)
3. Words highlighted in real-time: **green** (passage word matched), **red** (error/substitution)

**Backend Flow:**
1. Audio quality check (duration, RMS, active frames)
2. **Priority 1:** Use browser transcript if valid (skip Whisper API call)
3. **Priority 2:** Fallback to Groq Whisper Large v3 (language="en")
4. Hallucination detection (content-word overlap vs Rainbow Passage)
5. Calculate 5 metrics and generate scores

#### Reference Passage

**The Rainbow Passage** (Fairbanks, 1960) — standard in speech-language pathology research.

```
When the sunlight strikes raindrops in the air, they act as a prism
and form a rainbow. The rainbow is a division of white light into many
beautiful colors. These take the shape of a long round arch, with its
path high above and its two ends apparently beyond the horizon.
```

Expected reading time: 20–40 seconds (100–150 WPM normal pace)

#### 5 Speech Metrics (0–10 max score)

| Metric | Score | How it's calculated | Dyslexia indicator |
|---|---|---|---|
| **Reading Speed (WPM)** | 0–2 | Word count / audio duration × 60 | < 70 WPM = 2, < 100 WPM = 1, ≥ 100 WPM = 0 |
| **Word Error Rate (WER)** | 0–3 | jiwer vs Rainbow Passage reference | > 30% = 3, > 15% = 2, > 5% = 1, ≤ 5% = 0 |
| **Pause Count** | 0–2 | Frames with RMS < (mean − 1.5σ), floor 0.01 | > 15 pauses = 2, > 8 = 1, ≤ 8 = 0 |
| **Repetitions** | 0–2 | Consecutive duplicate words | > 5 = 2, > 2 = 1, ≤ 2 = 0 |
| **Phoneme Errors** | 0–1 | Soundex phoneme comparison (difflib alignment) | > 10% mismatch = 1, else = 0 |

#### Hallucination Detection

Whisper sometimes produces nonsense on silent or garbled audio:
- "Assalamu alaikum wa rahmatullahi wa barakatuh"
- "Thanks for watching"
- "The Game"

**Detection Method:**
- Extract content words (exclude stopwords like "the", "and", "for")
- Compare overlap with Rainbow Passage reference
- If overlap < 20% → reject as hallucination (return 422 error)

#### Quality Validation

Audio is rejected if:
- **Duration < 8 seconds** — Rainbow Passage takes ≥15s at any normal pace
- **RMS energy < 0.005** — Essentially silent (Whisper will hallucinate)
- **< 20% active frames** — Mostly dead air / background noise

---

## Scoring System

### Combined Risk Score

```
Overall Risk = round((Handwriting Score + Speech Score) / 2)

Risk Levels:
0–2   → Low Risk (minimal indicators)
3–5   → Medium Risk (moderate indicators)
6+    → High Risk (multiple strong indicators)
```

### Why This Matters

- **Low Risk** — Handwriting and speech patterns appear typical; minimal dyslexia indicators
- **Medium Risk** — Some indicators present; recommend further assessment by specialist
- **High Risk** — Multiple indicators suggest possible dyslexia; urgent professional evaluation recommended

### Limitations

⚠️ **Important:** This is a **preliminary screening tool only**, not a clinical diagnosis.

- Results are based on handwriting and speech analysis patterns commonly associated with dyslexia
- A positive result should prompt professional evaluation by a speech-language pathologist or educational psychologist
- False positives/negatives possible — individual writing/speech variations exist
- Environmental factors (pen quality, recording noise) affect results

---

## API Documentation

### Handwriting Analysis

**Endpoint:** `POST /analyze/handwriting`

**Request:**
```
Content-Type: multipart/form-data
- file: image (JPG/PNG, max 10MB)
```

**Response (200):**
```json
{
  "total_score": 8,
  "indicators": {
    "letter_reversals": 2,
    "spacing_issues": 1,
    "size_inconsistency": 2,
    "baseline_irregularity": 1,
    "stroke_width": 1,
    "slant_inconsistency": 1
  }
}
```

**Error (422):**
```json
{
  "detail": "The image appears to be a photo or colourful graphic. Please upload a clear handwriting sample."
}
```

---

### Letter Analysis

**Endpoint:** `POST /analyze/letters`

**Request:**
```
Content-Type: multipart/form-data
- images: 5 files (PNG crops of words: bed, dog, pup, quit, mum)
```

**Response (200):**
```json
{
  "total_reversals": 3,
  "per_word_analysis": [
    {
      "word": "bed",
      "per_letter": [
        {"letter": "b", "prediction": "reversed", "confidence": 0.92},
        {"letter": "e", "prediction": "normal", "confidence": 0.88},
        {"letter": "d", "prediction": "reversed", "confidence": 0.85}
      ]
    }
  ]
}
```

---

### Speech Analysis

**Endpoint:** `POST /analyze/speech`

**Request:**
```
Content-Type: multipart/form-data
- file: WAV audio (16kHz mono, 8–120 seconds)
- browser_transcript?: string (optional, from Web Speech API)
```

**Response (200):**
```json
{
  "total_score": 5,
  "transcript": "When the sunlight strikes raindrops...",
  "transcript_source": "browser",
  "indicators": {
    "reading_speed": 1,
    "word_error_rate": 2,
    "pause_count": 1,
    "repetition_count": 0,
    "phoneme_errors": 1
  },
  "metrics": {
    "wpm": 95,
    "wer": 0.18,
    "pause_count": 12,
    "repetition_count": 1,
    "phoneme_error_rate": 0.08,
    "wpm_reliable": true
  }
}
```

**Error (422):**
```json
{
  "detail": "Audio is too quiet or silent. Please re-record in a quiet environment."
}
```

---

## Known Issues

1. **`__pycache__` bytecode persistence** — Always restart the backend after editing Python files, otherwise cached bytecode may run
2. **Web Speech API browser support** — Only works in Chrome/Edge; Firefox falls back to Whisper-only (live transcript box hidden)
3. **Frontend risk thresholds outdated** — Handwriting max score changed from 12 → 16, but Results.jsx still uses old threshold logic
4. **Groq API dependency** — Application will crash at startup if `GROQ_API_KEY` is not in `.env`
5. **CORS restriction** — Currently allows only `localhost:3000`; update `main.py` for production deployment
6. **RecordRTC WAV compatibility** — Some microphone/browser combinations produce WAV files Whisper cannot decode; browser transcript is fallback

---

## Future Work

### Priority 1 — Bug Fixes

- [ ] Recalibrate frontend risk thresholds for 0–16 handwriting scale
- [ ] Move `BASE_URL` from hardcoded `localhost:8000` to `.env` file
- [ ] Add file size limits to upload endpoints
- [ ] Add comprehensive error logs

### Priority 2 — Enhancements

- [ ] Weighted scoring (reversals + WER are strong indicators; pauses + slant are weak)
- [ ] Per-module risk display (don't average handwriting + speech)
- [ ] User authentication and result persistence
- [ ] Batch processing (multiple test sessions for one user)

### Priority 3 — Deployment

- [ ] Docker containerization (frontend + backend)
- [ ] Database integration (PostgreSQL for test history)
- [ ] AWS/GCP deployment setup
- [ ] HIPAA compliance review

---

## Development Notes

### Backend — Key Design Decisions

**Why CLAHE over global histogram equalization?**
Pencil strokes on textured paper have low contrast. Global equalization washes them out; CLAHE applies local equalization per tile, preserving stroke visibility.

**Why adaptive thresholding over Otsu?**
Phone photos of handwriting have uneven lighting. Otsu computes a single global threshold, losing strokes in underexposed areas. Adaptive (Gaussian) uses neighborhood-based thresholds.

**Why auto-deskew before all detectors?**
Even 3° tilt skews baseline and size metrics. Single deskew applied before all 6 detectors ensures consistent results.

**Why browser transcript priority over Whisper?**
Whisper sometimes garbles audio from certain accents/microphones while browser SpeechRecognition transcribes correctly. Browser transcript is sent alongside audio; backend uses it if valid.

### Frontend — Component Flow

```
App (Router)
├── Navbar (dark mode toggle)
├── Home (landing page)
├── Test
│   ├── StepHandwriting (dropzone → analyze)
│   ├── StepLetters (canvas → CNN inference)
│   ├── StepSpeech (RecordRTC + Web Speech API)
│   └── Results (radar chart → PDF export)
├── History (localStorage list)
└── About (dyslexia info)
```

### Running in Development

```bash
# Terminal 1 — Backend
cd backend && python -m uvicorn main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend && npm start
```

Use `--reload` flag for auto-restart on file changes.

---

## Contributing

This is a final year academic project. For improvements:

1. Create a feature branch from `main`
2. Make changes and test thoroughly
3. Update documentation in this README
4. Submit pull request with detailed explanation

---

## License

Academic project. Check with JNTUK for licensing terms.

---

## Contact & Support

For issues, questions, or suggestions about this project, refer to the issue tracker or documentation.

---

## Acknowledgments

- **Kaggle Dyslexia Handwriting Dataset** — Training data for letter classifier
- **Rainbow Passage** — Standard speech evaluation reference (Fairbanks, 1960)
- **Groq API** — Whisper transcription service
- **OpenCV, NumPy, Pillow** — Image processing libraries
- **FastAPI, React** — Web framework stack

---

**Last Updated:** May 1, 2026
