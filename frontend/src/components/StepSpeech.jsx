import { useState, useRef, useEffect } from "react";
import RecordRTC from "recordrtc";
import { analyzeSpeechWithTranscript } from "../api";
import { Mic, MicOff, Loader2, ArrowRight, BookOpen, RotateCcw, Play, AlertCircle } from "lucide-react";

const PASSAGE = `When the sunlight strikes raindrops in the air, they act as a prism and form a rainbow. The rainbow is a division of white light into many beautiful colors. These take the shape of a long round arch, with its path high above and its two ends apparently beyond the horizon.`;

// Normalise a word for matching: lowercase, strip punctuation
const norm = w => w.toLowerCase().replace(/[^a-z]/g, "");

// Set of passage words for live highlight matching
const PASSAGE_WORDS = new Set(PASSAGE.split(/\s+/).map(norm).filter(Boolean));

export default function StepSpeech({ onDone, hidePassage = false }) {
  const [recording, setRecording]         = useState(false);
  const [audioBlob, setAudioBlob]         = useState(null);
  const [audioUrl, setAudioUrl]           = useState(null);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState(null);
  const [timer, setTimer]                 = useState(0);
  const [starting, setStarting]           = useState(false);
  const [finalTranscript, setFinalTranscript]     = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [speechSupported, setSpeechSupported]     = useState(true);

  const recorderRef     = useRef(null);
  const streamRef       = useRef(null);
  const timerRef        = useRef(null);
  const startTimeRef    = useRef(null);
  const recognitionRef  = useRef(null);
  const liveBoxRef      = useRef(null);

  // Check browser support on mount
  useEffect(() => {
    if (!("SpeechRecognition" in window) && !("webkitSpeechRecognition" in window)) {
      setSpeechSupported(false);
    }
  }, []);

  // Auto-scroll live transcript box as words come in
  useEffect(() => {
    if (liveBoxRef.current) {
      liveBoxRef.current.scrollTop = liveBoxRef.current.scrollHeight;
    }
  }, [finalTranscript, interimTranscript]);

  const startRecording = async () => {
    if (starting || recording) return;
    setStarting(true); setError(null);
    setFinalTranscript(""); setInterimTranscript("");
    clearInterval(timerRef.current); setTimer(0);

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Microphone access denied. Please allow microphone permission in your browser settings.");
      setStarting(false);
      return;
    }

    try {
      streamRef.current = stream;

      // StereoAudioRecorder works across Chrome, Edge, and Firefox.
      // Do NOT pass sampleRate — Firefox ignores it and some versions throw.
      // Whisper (Groq) handles any sample rate on the backend.
      const recorder = new RecordRTC(stream, {
        type: "audio",
        mimeType: "audio/wav",
        recorderType: RecordRTC.StereoAudioRecorder,
        numberOfAudioChannels: 1,
      });
      recorder.startRecording();
      recorderRef.current  = recorder;
      startTimeRef.current = Date.now();
      setRecording(true);

      timerRef.current = setInterval(() => {
        setTimer(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 500);

      // Web Speech API — live display only, not used for scoring
      // Supported in Chrome/Edge. Firefox falls back gracefully (live box hidden).
      if (speechSupported) {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SR();
        recognition.lang = "en-US";
        recognition.continuous = true;
        recognition.interimResults = true;

        let accumulatedFinal = "";

        recognition.onresult = (e) => {
          let interim = "";
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const t = e.results[i][0].transcript;
            if (e.results[i].isFinal) {
              accumulatedFinal += t + " ";
            } else {
              interim = t;
            }
          }
          setFinalTranscript(accumulatedFinal);
          setInterimTranscript(interim);
        };

        recognition.onerror = () => {
          // Non-fatal — live display just stops, Whisper still handles analysis
        };

        recognition.start();
        recognitionRef.current = recognition;
      }
    } catch (err) {
      stream.getTracks().forEach(t => t.stop());
      setError(`Could not start recording: ${err?.message || "Unknown error"}. Try using Chrome or Edge.`);
    } finally {
      setStarting(false);
    }
  };

  const stopRecording = () => {
    clearInterval(timerRef.current); timerRef.current = null;

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    setInterimTranscript("");

    recorderRef.current.stopRecording(() => {
      const blob = recorderRef.current.getBlob();
      setAudioBlob(blob);
      setAudioUrl(URL.createObjectURL(blob));
      streamRef.current.getTracks().forEach(t => t.stop());
      setRecording(false);
    });
  };

  const handleAnalyze = async () => {
    if (!audioBlob) { setError("Please record your speech first."); return; }
    setLoading(true); setError(null);
    try {
      // Pass the browser's SpeechRecognition transcript alongside the audio.
      // If available, the backend skips Whisper and uses it directly —
      // avoiding Whisper hallucination/garbling issues with certain accents or mic setups.
      const result = await analyzeSpeechWithTranscript(audioBlob, finalTranscript);
      onDone(result);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (err?.response?.status === 422 && detail && typeof detail === "object") {
        setError(detail);
      } else if (err?.response?.status === 422 && detail) {
        setError(detail);
      } else {
        setError(`Analysis failed: ${detail || err?.message || "Unknown error"}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReRecord = () => {
    setAudioBlob(null); setAudioUrl(null);
    setFinalTranscript(""); setInterimTranscript("");
    setError(null);
  };

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // Render final transcript words with passage-match highlighting
  const renderHighlighted = (text) => {
    if (!text.trim()) return null;
    return text.trim().split(/\s+/).map((word, i) => {
      const matched = PASSAGE_WORDS.has(norm(word));
      return (
        <span key={i} style={{
          color: matched ? "var(--success)" : "var(--danger)",
          fontWeight: matched ? 600 : 400,
          whiteSpace: "normal",
        }}>
          {word}{" "}
        </span>
      );
    });
  };

  const liveText = finalTranscript + interimTranscript;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: "rgba(139,92,246,0.1)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Mic size={15} color="var(--violet)" />
        </div>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", margin: 0, letterSpacing: "-0.02em" }}>
          Speech Analysis
        </h2>
      </div>
      <p style={{ fontSize: 13.5, color: "var(--text-sec)", margin: "0 0 12px", paddingLeft: 42 }}>
        Record yourself reading the passage aloud at a natural pace.
      </p>
      {!speechSupported && (
        <div style={{
          marginBottom: 16, marginLeft: 42, padding: "8px 12px", borderRadius: 8,
          background: "var(--warning-subtle)", border: "1px solid var(--warning-border)",
          fontSize: 12, color: "var(--warning-text)",
        }}>
          Live transcription is not supported in this browser. Recording and analysis still work — use Chrome or Edge for the best experience.
        </div>
      )}

      {/* Passage */}
      {!hidePassage && (
        <div style={{
          borderRadius: 12, padding: "18px 20px", marginBottom: 20,
          background: "var(--bg-subtle)", border: "1px solid var(--border)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
            <BookOpen size={13} color="var(--primary)" />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--primary)" }}>
              Read this passage aloud
            </span>
          </div>
          <p style={{ fontSize: 14.5, lineHeight: 1.75, color: "var(--text)", margin: 0 }}>{PASSAGE}</p>
        </div>
      )}

      {/* Recorder */}
      <div style={{
        borderRadius: 14, padding: "24px", marginBottom: 16, textAlign: "center",
        background: "var(--bg-subtle)", border: "1px solid var(--border)",
      }}>
        {recording ? (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 16 }}>
              <div style={{
                width: 52, height: 52, borderRadius: "50%",
                background: "var(--danger-subtle)", border: "2px solid var(--danger)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <Mic size={20} color="var(--danger)" />
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{
                  fontSize: 28, fontWeight: 800, color: "var(--danger)",
                  letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums", lineHeight: 1,
                }}>
                  {fmt(timer)}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>Recording…</div>
              </div>
            </div>

            {/* Live transcript box */}
            {speechSupported && (
              <div
                ref={liveBoxRef}
                style={{
                  minHeight: 72, maxHeight: 120, overflowY: "auto", overflowX: "hidden",
                  borderRadius: 10, padding: "10px 14px", marginBottom: 16,
                  background: "var(--surface)", border: "1px solid var(--border)",
                  textAlign: "left", lineHeight: 1.75, fontSize: 13.5,
                  scrollBehavior: "smooth",
                  wordBreak: "break-word", overflowWrap: "break-word",
                }}
              >
                {liveText.trim() ? (
                  <>
                    {renderHighlighted(finalTranscript)}
                    {interimTranscript && (
                      <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
                        {interimTranscript}
                      </span>
                    )}
                  </>
                ) : (
                  <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
                    Start speaking — your words will appear here…
                  </span>
                )}
              </div>
            )}

            {/* Legend */}
            {speechSupported && liveText.trim() && (
              <div style={{ display: "flex", gap: 16, justifyContent: "center", marginBottom: 16, fontSize: 11 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--success)", fontWeight: 600 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--success)", display: "inline-block" }} />
                  Passage word
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--danger)" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--danger)", display: "inline-block" }} />
                  Not in passage
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-muted)", fontStyle: "italic" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--text-muted)", display: "inline-block" }} />
                  Still listening…
                </span>
              </div>
            )}

            <button onClick={stopRecording} style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              padding: "10px 26px", borderRadius: 9,
              background: "var(--danger)", color: "white",
              fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer",
            }}>
              <MicOff size={15} /> Stop Recording
            </button>
          </>
        ) : (
          <>
            <div style={{
              width: 64, height: 64, borderRadius: "50%", margin: "0 auto 14px",
              background: "var(--success-subtle)", border: "1px solid var(--success-border)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Mic size={24} color="var(--success)" />
            </div>
            <p style={{ fontSize: 13, color: "var(--text-sec)", margin: "0 0 22px" }}>
              {audioBlob ? "Recording saved. Re-record or analyze below." : "Click start and read the passage aloud"}
            </p>
            <button onClick={startRecording} disabled={starting} style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              padding: "10px 26px", borderRadius: 9,
              background: starting ? "var(--surface-raised)" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: starting ? "var(--text-muted)" : "white",
              fontWeight: 700, fontSize: 14, border: "none",
              cursor: starting ? "not-allowed" : "pointer",
            }}>
              {starting ? <Loader2 size={15} className="animate-spin" /> : <Mic size={15} />}
              {starting ? "Starting…" : audioBlob ? "Re-record" : "Start Recording"}
            </button>
          </>
        )}
      </div>

      {/* Live transcript summary after recording stops — hide if error already shows it */}
      {!recording && finalTranscript && !error && (
        <div style={{
          borderRadius: 10, padding: "12px 16px", marginBottom: 16,
          background: "var(--bg-subtle)", border: "1px solid var(--border)",
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>
            What was heard
          </div>
          <div style={{
            fontSize: 13.5, lineHeight: 1.75,
            wordBreak: "break-word", overflowWrap: "break-word",
            display: "flex", flexWrap: "wrap", gap: "0 2px",
          }}>
            {renderHighlighted(finalTranscript)}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 11 }}>
            <span style={{ color: "var(--success)", fontWeight: 600 }}>
              ● Passage words
            </span>
            <span style={{ color: "var(--danger)" }}>
              ● Possible errors / substitutions
            </span>
          </div>
        </div>
      )}

      {/* Playback */}
      {audioUrl && !recording && (
        <div style={{
          borderRadius: 10, padding: "14px 16px", marginBottom: 16,
          background: "var(--bg-subtle)", border: "1px solid var(--border)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
            <Play size={13} color="var(--text-sec)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Your Recording</span>
          </div>
          <audio controls src={audioUrl} style={{ width: "100%", height: 36 }} />
          <button onClick={handleReRecord} style={{
            display: "flex", alignItems: "center", gap: 5,
            fontSize: 12, color: "var(--danger)", background: "none",
            border: "none", cursor: "pointer", padding: "4px 0 0",
          }}>
            <RotateCcw size={11} /> Re-record
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          borderRadius: 10, marginBottom: 16, fontSize: 13,
          background: "var(--danger-subtle)", border: "1px solid var(--danger-border)",
          color: "var(--danger-text)", overflow: "hidden",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "12px 14px" }}>
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ lineHeight: 1.6 }}>
              <strong>{typeof error === "object" ? error.message : error}</strong>
            </div>
          </div>
          {typeof error === "object" && error.transcribed && (
            <div style={{
              margin: "0 14px", padding: "8px 12px", borderRadius: 7,
              background: "rgba(0,0,0,0.06)", fontSize: 12,
              fontStyle: "italic", lineHeight: 1.5,
            }}>
              <span style={{ fontStyle: "normal", fontWeight: 700 }}>What was heard: </span>
              "{error.transcribed}"
            </div>
          )}
          {typeof error === "object" && error.tips && (
            <ul style={{ margin: "10px 14px 0", paddingLeft: 18, fontSize: 12, lineHeight: 1.7 }}>
              {error.tips.map((tip, i) => <li key={i}>{tip}</li>)}
            </ul>
          )}
          <div style={{ padding: "10px 14px" }}>
            <button
              onClick={handleReRecord}
              style={{
                fontSize: 12, fontWeight: 700, color: "var(--danger)",
                background: "none", border: "1px solid var(--danger-border)",
                borderRadius: 6, padding: "4px 12px", cursor: "pointer",
              }}
            >
              Clear &amp; Re-record
            </button>
          </div>
        </div>
      )}

      <button onClick={handleAnalyze} disabled={loading || !audioBlob} style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        padding: "13px", borderRadius: 10, border: "none",
        cursor: loading || !audioBlob ? "not-allowed" : "pointer",
        background: loading || !audioBlob ? "var(--surface-raised)" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
        color: loading || !audioBlob ? "var(--text-muted)" : "white",
        fontWeight: 700, fontSize: 14,
        boxShadow: loading || !audioBlob ? "none" : "0 4px 16px rgba(99,102,241,0.3)",
      }}>
        {loading
          ? <><Loader2 size={15} className="animate-spin" /> Analyzing Speech…</>
          : <>Analyze &amp; View Results <ArrowRight size={15} /></>}
      </button>
    </div>
  );
}
