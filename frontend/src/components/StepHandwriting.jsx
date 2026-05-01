import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { analyzeHandwriting } from "../api";
import { Upload, ImagePlus, Loader2, ArrowRight, Info } from "lucide-react";

export default function StepHandwriting({ onDone, hideTip = false }) {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setError("");
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png"] },
    maxFiles: 1,
  });

  const handleAnalyze = async () => {
    if (!image) { setError("Please upload a handwriting image first."); return; }
    setLoading(true); setError("");
    try {
      const formData = new FormData();
      formData.append("file", image);
      const result = await analyzeHandwriting(formData);
      onDone(result);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      // 422 = image validation rejection — surface the backend message directly
      if (err?.response?.status === 422 && detail) {
        setError(detail);
      } else {
        setError(`Analysis failed: ${detail || err?.message || "Unknown error"}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: "var(--primary-subtle)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <ImagePlus size={15} color="var(--primary)" />
        </div>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", margin: 0, letterSpacing: "-0.02em" }}>
          Handwriting Analysis
        </h2>
      </div>
      <p style={{ fontSize: 13.5, color: "var(--text-sec)", margin: "0 0 24px", paddingLeft: 42 }}>
        Upload a clear photo of a handwriting sample.
      </p>

      {/* Tip — shown only when not in side layout */}
      {!hideTip && (
        <div style={{
          display: "flex", gap: 10, padding: "12px 16px", borderRadius: 10, marginBottom: 20,
          background: "var(--success-subtle)", border: "1px solid var(--success-border)",
        }}>
          <Info size={14} color="var(--success)" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12.5, color: "var(--success-text)", margin: 0, lineHeight: 1.6 }}>
            <strong>Best results:</strong> Ask the child to write <em>"The quick brown fox jumps over the lazy dog"</em> on plain white paper with a clear, well-lit photo.
          </p>
        </div>
      )}

      {/* Dropzone */}
      <div {...getRootProps()} style={{
        borderRadius: 14,
        border: `2px dashed ${isDragActive ? "var(--primary)" : "var(--border-strong)"}`,
        background: isDragActive ? "var(--primary-subtle)" : "var(--bg-subtle)",
        cursor: "pointer", marginBottom: 16, overflow: "hidden",
        transition: "border-color 0.15s, background 0.15s",
      }}>
        <input {...getInputProps()} />
        {preview ? (
          <div style={{ position: "relative" }}>
            <img src={preview} alt="Handwriting" style={{ width: "100%", maxHeight: 260, objectFit: "contain", display: "block" }} />
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              padding: "8px", textAlign: "center", fontSize: 12,
              background: "rgba(0,0,0,0.5)", color: "white",
            }}>
              Click or drag to replace
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "52px 24px" }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, marginBottom: 14,
              background: "var(--primary-subtle)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Upload size={22} color="var(--primary)" />
            </div>
            <p style={{ fontWeight: 600, fontSize: 14, color: "var(--text)", margin: "0 0 4px" }}>
              {isDragActive ? "Drop the image here" : "Drag & drop or click to upload"}
            </p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>JPG, PNG supported</p>
          </div>
        )}
      </div>

      {error && (
        <div style={{
          padding: "12px 14px", borderRadius: 9, marginBottom: 16, fontSize: 13,
          background: "var(--danger-subtle)", border: "1px solid var(--danger-border)",
          color: "var(--danger-text)", lineHeight: 1.6,
        }}>
          <strong>Image issue:</strong> {error}
          <div style={{ marginTop: 8 }}>
            <button
              onClick={() => { setImage(null); setPreview(null); setError(""); }}
              style={{
                fontSize: 12, fontWeight: 700, color: "var(--danger)",
                background: "none", border: "1px solid var(--danger-border)",
                borderRadius: 6, padding: "4px 12px", cursor: "pointer",
              }}
            >
              Remove &amp; Upload Again
            </button>
          </div>
        </div>
      )}

      <button onClick={handleAnalyze} disabled={loading || !image} style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        padding: "13px", borderRadius: 10, border: "none",
        cursor: loading || !image ? "not-allowed" : "pointer",
        background: loading || !image ? "var(--surface-raised)" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
        color: loading || !image ? "var(--text-muted)" : "white",
        fontWeight: 700, fontSize: 14,
        boxShadow: loading || !image ? "none" : "0 4px 16px rgba(99,102,241,0.3)",
      }}>
        {loading
          ? <><Loader2 size={15} className="animate-spin" /> Analyzing...</>
          : <>Analyze Handwriting <ArrowRight size={15} /></>}
      </button>
    </div>
  );
}
