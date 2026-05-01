import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.handwriting import router as handwriting_router
from routes.speech import router as speech_router
from routes.letters import router as letters_router

app = FastAPI(title="DyslexiaDetect API", version="1.0.0")

# ALLOWED_ORIGINS env var lets you add deployed frontend URLs without touching code.
# e.g. ALLOWED_ORIGINS=https://dyslexai.vercel.app,https://dyslexai.netlify.app
_extra = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o.strip()]
_origins = ["http://localhost:3000", "https://dyslex-ai-virid.vercel.app"] + _extra

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(handwriting_router, prefix="/analyze")
app.include_router(speech_router, prefix="/analyze")
app.include_router(letters_router, prefix="/analyze")

@app.get("/")
def root():
    return {"message": "DyslexiaDetect API is running"}

