import { useRef, useState, useEffect } from "react";
import { PenLine, Trash2, ArrowRight, ArrowLeft, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { analyzeLetters } from "../api";

const WORDS = ["bed", "dog", "pup", "quit", "mum"];
const CANVAS_W = 600;
const CANVAS_H = 160;

export default function StepLetters({ onDone }) {
  const [current, setCurrent]     = useState(0);          // which word is active
  const [hasDrawn, setHasDrawn]   = useState(Array(WORDS.length).fill(false));
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);

  const canvasRefs = useRef(WORDS.map(() => null));
  const drawingRef = useRef(Array(WORDS.length).fill(false));

  // White-fill all canvases once on mount
  useEffect(() => {
    WORDS.forEach((_, i) => {
      const canvas = canvasRefs.current[i];
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    });
  }, []);

  const getPos = (e, canvas) => {
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const src    = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top)  * scaleY,
    };
  };

  const startDraw = (i, e) => {
    e.preventDefault();
    const canvas = canvasRefs.current[i];
    const ctx    = canvas.getContext("2d");
    const pos    = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    drawingRef.current[i] = true;
  };

  const draw = (i, e) => {
    e.preventDefault();
    if (!drawingRef.current[i]) return;
    const canvas = canvasRefs.current[i];
    const ctx    = canvas.getContext("2d");
    const pos    = getPos(e, canvas);
    ctx.lineWidth   = 3.5;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
    ctx.strokeStyle = "#1e1b4b";
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasDrawn(prev => {
      if (prev[i]) return prev;
      const next = [...prev]; next[i] = true; return next;
    });
  };

  const stopDraw = (i) => { drawingRef.current[i] = false; };

  const clearCanvas = (i) => {
    const canvas = canvasRefs.current[i];
    const ctx    = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    setHasDrawn(prev => { const next = [...prev]; next[i] = false; return next; });
  };

  const handleNext = () => {
    if (!hasDrawn[current]) return;
    setError(null);
    setCurrent(c => c + 1);
  };

  const handleBack = () => {
    setError(null);
    setCurrent(c => c - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const blobs = await Promise.all(
        canvasRefs.current.map(
          canvas => new Promise(resolve => canvas.toBlob(resolve, "image/png"))
        )
      );
      const result = await analyzeLetters(blobs);
      onDone(result);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(`Analysis failed: ${detail || err?.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const isLast = current === WORDS.length - 1;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: "var(--primary-subtle)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <PenLine size={15} color="var(--primary)" />
        </div>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", margin: 0, letterSpacing: "-0.02em" }}>
          Letter Writing Test
        </h2>
      </div>
      <p style={{ fontSize: 13.5, color: "var(--text-sec)", margin: "0 0 22px", paddingLeft: 42 }}>
        Write each word in the box using your mouse or finger. Write naturally — don't trace.
      </p>

      {/* Step progress dots */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 24 }}>
        {WORDS.map((word, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", flex: i < WORDS.length - 1 ? 1 : "none" }}>
            <div
              onClick={() => hasDrawn[i] || i <= current ? setCurrent(i) : null}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                cursor: hasDrawn[i] || i <= current ? "pointer" : "default",
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: i < current
                  ? "var(--success)"
                  : i === current
                  ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
                  : "var(--surface-raised)",
                border: i === current ? "none" : `2px solid ${i < current ? "var(--success)" : "var(--border)"}`,
                boxShadow: i === current ? "0 0 0 4px var(--primary-subtle)" : "none",
                transition: "all 0.2s",
              }}>
                {i < current
                  ? <CheckCircle size={14} color="white" />
                  : <span style={{
                      fontSize: 12, fontWeight: 700,
                      color: i === current ? "white" : "var(--text-muted)",
                      fontFamily: "Georgia, serif",
                    }}>
                      {word}
                    </span>
                }
              </div>
            </div>
            {i < WORDS.length - 1 && (
              <div style={{
                flex: 1, height: 2, margin: "0 4px", marginBottom: 20,
                background: i < current ? "var(--success)" : "var(--border)",
                transition: "background 0.3s",
              }} />
            )}
          </div>
        ))}
      </div>

      {/* Canvas area — all rendered but only current is visible */}
      {WORDS.map((word, i) => (
        <div key={word} style={{ display: i === current ? "block" : "none" }}>

          {/* Word prompt */}
          <div style={{
            textAlign: "center", marginBottom: 16,
          }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 8px" }}>
              Word {i + 1} of {WORDS.length} — write this word:
            </p>
            <span style={{
              fontSize: 52, fontWeight: 800, color: "var(--primary)",
              letterSpacing: "0.1em", fontFamily: "Georgia, serif",
              lineHeight: 1,
            }}>
              {word}
            </span>
          </div>

          {/* Canvas */}
          <div style={{
            borderRadius: 14,
            border: `1.5px solid ${hasDrawn[i] ? "var(--success-border)" : "var(--border)"}`,
            overflow: "hidden",
            marginBottom: 10,
            transition: "border-color 0.2s",
          }}>
            <canvas
              ref={el => { canvasRefs.current[i] = el; }}
              width={CANVAS_W}
              height={CANVAS_H}
              style={{
                display: "block", width: "100%", height: 160,
                cursor: "crosshair", background: "#ffffff",
                touchAction: "none",
              }}
              onMouseDown={e => startDraw(i, e)}
              onMouseMove={e => draw(i, e)}
              onMouseUp={() => stopDraw(i)}
              onMouseLeave={() => stopDraw(i)}
              onTouchStart={e => startDraw(i, e)}
              onTouchMove={e => draw(i, e)}
              onTouchEnd={() => stopDraw(i)}
            />
          </div>

          {/* Clear button */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
            <button onClick={() => clearCanvas(i)} style={{
              display: "flex", alignItems: "center", gap: 5,
              fontSize: 12, color: "var(--text-muted)",
              background: "none", border: "1px solid var(--border)",
              borderRadius: 7, padding: "5px 12px", cursor: "pointer",
            }}>
              <Trash2 size={11} /> Clear
            </button>
          </div>
        </div>
      ))}

      {/* Error */}
      {error && (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 8,
          padding: "10px 14px", borderRadius: 9, marginBottom: 14,
          background: "var(--danger-subtle)", border: "1px solid var(--danger-border)",
          fontSize: 13, color: "var(--danger-text)",
        }}>
          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          {error}
        </div>
      )}

      {/* Navigation buttons */}
      <div style={{ display: "flex", gap: 10 }}>
        {current > 0 && (
          <button onClick={handleBack} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "12px 20px", borderRadius: 10, border: "1px solid var(--border)",
            background: "var(--surface)", color: "var(--text-sec)",
            fontWeight: 600, fontSize: 14, cursor: "pointer",
          }}>
            <ArrowLeft size={15} /> Back
          </button>
        )}

        {!isLast ? (
          <button
            onClick={handleNext}
            disabled={!hasDrawn[current]}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "13px", borderRadius: 10, border: "none",
              cursor: hasDrawn[current] ? "pointer" : "not-allowed",
              background: hasDrawn[current]
                ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
                : "var(--surface-raised)",
              color: hasDrawn[current] ? "white" : "var(--text-muted)",
              fontWeight: 700, fontSize: 14,
              boxShadow: hasDrawn[current] ? "0 4px 16px rgba(99,102,241,0.3)" : "none",
              transition: "all 0.2s",
            }}
          >
            Next Word <ArrowRight size={15} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading || !hasDrawn[current]}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "13px", borderRadius: 10, border: "none",
              cursor: loading || !hasDrawn[current] ? "not-allowed" : "pointer",
              background: loading || !hasDrawn[current]
                ? "var(--surface-raised)"
                : "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: loading || !hasDrawn[current] ? "var(--text-muted)" : "white",
              fontWeight: 700, fontSize: 14,
              boxShadow: loading || !hasDrawn[current] ? "none" : "0 4px 16px rgba(99,102,241,0.3)",
            }}
          >
            {loading
              ? <><Loader2 size={15} className="animate-spin" /> Analyzing Letters…</>
              : <>Analyze Letters <ArrowRight size={15} /></>}
          </button>
        )}
      </div>

      {/* "Write to continue" hint */}
      {!hasDrawn[current] && (
        <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)", marginTop: 10 }}>
          Write the word above to continue
        </p>
      )}
    </div>
  );
}
