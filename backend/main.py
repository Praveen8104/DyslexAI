import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.handwriting import router as handwriting_router
from routes.speech import router as speech_router
from routes.letters import router as letters_router

app = FastAPI(title="DyslexiaDetect API", version="1.0.0")

# The frontends this API answers. Origins are compared exactly, so each entry is
# scheme + host with no trailing slash and no path.
# ALLOWED_ORIGINS adds more at runtime without a code change — comma separated.
_extra = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o.strip()]
_origins = [
    "http://localhost:3000",              # development
    "https://dyslexai.praveenreddy.dev",  # production
] + _extra

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

