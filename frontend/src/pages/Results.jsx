import { useLocation, useNavigate } from "react-router-dom";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from "recharts";
import jsPDF from "jspdf";
import { CheckCircle, AlertTriangle, XCircle, Download, RotateCcw, Home, PenLine, Mic, ShieldCheck, Type } from "lucide-react";

const RISK = {
  Low:    { color: "#10b981", subtle: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.2)",  icon: CheckCircle,   label: "Low Risk",    msg: "No significant dyslexia indicators detected. Continue monitoring." },
  Medium: { color: "#f59e0b", subtle: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.2)",  icon: AlertTriangle, label: "Medium Risk", msg: "Some indicators found. A professional evaluation is recommended." },
  High:   { color: "#ef4444", subtle: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.2)",   icon: XCircle,       label: "High Risk",   msg: "Strong indicators detected. Professional evaluation is strongly advised." },
};

// Per-module risk thresholds calibrated to each module's actual max score.
// Handwriting max = 16: ~25 % = 4, ~60 % = 10
// Speech      max = 10: ~25 % = 2, ~60 % = 6  (unchanged)
// Combined    max = 13: ~25 % = 3, ~60 % = 8
const getHwRisk   = s => s >= 10 ? "High" : s >= 4 ? "Medium" : "Low";
const getSpRisk   = s => s >= 6  ? "High" : s >= 3 ? "Medium" : "Low";
const getCombRisk = s => s >= 8  ? "High" : s >= 4 ? "Medium" : "Low";


const Card = ({ children, style = {} }) => (
  <div style={{
    background: "var(--surface)", border: "1px solid var(--border)",
    borderRadius: 16, boxShadow: "var(--shadow-sm)", ...style,
  }}>
    {children}
  </div>
);

export default function Results() {
  const { state = {} } = useLocation();
  const navigate = useNavigate();
  const { handwriting, letters, speech } = state;

  const hwScore = handwriting?.total_score ?? null;
  const spScore = speech?.total_score ?? null;
  const overallScore = hwScore !== null && spScore !== null
    ? Math.round((hwScore + spScore) / 2)
    : hwScore ?? spScore;

  const overallRisk = overallScore !== null ? getCombRisk(overallScore) : null;
  const R = overallRisk ? RISK[overallRisk] : null;
  const RiskIcon = R?.icon;

  const radarData = [
    ...(handwriting ? [
      { subject: "Reversals", score: handwriting.indicators?.reversal_score ?? 0 },
      { subject: "Spacing",   score: handwriting.indicators?.spacing_score ?? 0 },
      { subject: "Size",      score: handwriting.indicators?.size_score ?? 0 },
      { subject: "Baseline",  score: handwriting.indicators?.baseline_score ?? 0 },
      { subject: "Stroke",    score: handwriting.indicators?.stroke_score ?? 0 },
      { subject: "Slant",     score: handwriting.indicators?.slant_score ?? 0 },
    ] : []),
    ...(speech ? [
      { subject: "Speed",      score: speech.indicators?.speed_score ?? 0 },
      { subject: "Word Errors",score: speech.indicators?.wer_score ?? 0 },
      { subject: "Pauses",     score: speech.indicators?.pause_score ?? 0 },
    ] : []),
  ];

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20); doc.text("Dyslexia Assessment Report", 20, 20);
    doc.setFontSize(12);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 35);
    doc.text(`Overall Risk: ${overallRisk}  |  Score: ${overallScore}`, 20, 47);
    if (handwriting) {
      doc.text("--- Handwriting Analysis ---", 20, 63);
      doc.text(`Risk: ${getHwRisk(hwScore)}  |  Score: ${hwScore}`, 20, 75);
      doc.text(`Letter Reversals: ${handwriting.indicators?.reversal_score}`, 20, 87);
      doc.text(`Spacing Issues: ${handwriting.indicators?.spacing_score}`, 20, 99);
      doc.text(`Size Inconsistency: ${handwriting.indicators?.size_score}`, 20, 111);
      doc.text(`Baseline Irregularity: ${handwriting.indicators?.baseline_score}`, 20, 123);
      doc.text(`Stroke Width Variance: ${handwriting.indicators?.stroke_score}`, 20, 135);
      doc.text(`Slant Inconsistency: ${handwriting.indicators?.slant_score}`, 20, 147);
    }
    if (speech) {
      const y = handwriting ? 163 : 63;
      doc.text("--- Speech Analysis ---", 20, y);
      doc.text(`Risk: ${getSpRisk(spScore)}  |  Score: ${spScore}`, 20, y + 12);
      doc.text(`Reading Speed: ${speech.indicators?.words_per_minute} wpm`, 20, y + 24);
      doc.text(`Word Error Rate: ${speech.indicators?.wer_percent}%`, 20, y + 36);
      doc.text(`Pause Count: ${speech.indicators?.pause_count}`, 20, y + 48);
    }
    doc.setFontSize(9);
    doc.text("Disclaimer: Screening tool only. Consult a specialist for clinical diagnosis.", 20, 272);
    doc.save("dyslexia-report.pdf");
  };

  if (!overallRisk) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "50vh", gap: 16 }}>
      <AlertTriangle size={40} color="var(--warning)" />
      <p style={{ color: "var(--text-sec)" }}>No results found. Please complete a test first.</p>
      <button onClick={() => navigate("/test")} style={{
        padding: "10px 24px", borderRadius: 10,
        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
        color: "white", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer",
      }}>
        Go to Test
      </button>
    </div>
  );

  /* outer wrapper: full viewport height minus navbar, no page scroll */
  return (
    <div style={{
      height: "calc(100vh - 60px)",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
      maxWidth: 1060, margin: "0 auto", padding: "28px 24px 0",
      boxSizing: "border-box",
    }}>

      {/* Page header — fixed, never scrolls */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexShrink: 0, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text)", margin: "0 0 2px" }}>
            Assessment Results
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-sec)", margin: 0 }}>
            Completed on {new Date().toLocaleDateString()}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={downloadPDF} style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 9,
            background: "var(--text)", color: "var(--bg)",
            fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer",
          }}>
            <Download size={14} /> Download PDF
          </button>
          <button onClick={() => navigate("/test")} style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 9,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            color: "white", fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer",
          }}>
            <RotateCcw size={14} /> New Test
          </button>
          <button onClick={() => navigate("/")} style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 9,
            background: "var(--surface)", color: "var(--text-sec)",
            fontWeight: 600, fontSize: 13,
            border: "1px solid var(--border)", cursor: "pointer",
          }}>
            <Home size={14} /> Home
          </button>
        </div>
      </div>

      {/* Two-column layout — fills remaining height, each column scrolls independently */}
      <div style={{
        display: "grid", gridTemplateColumns: "320px 1fr", gap: 20,
        flex: 1, overflow: "hidden", paddingBottom: 24,
      }}>

        {/* ── Left column ── */}
        <div className="no-scrollbar" style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>

          <Card style={{ padding: 22, textAlign: "center", background: R.subtle, borderColor: R.border, flexShrink: 0 }}>
            <div style={{
              width: 48, height: 48, borderRadius: "50%",
              background: `${R.color}18`,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 12px",
            }}>
              <RiskIcon size={22} color={R.color} />
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: R.color, letterSpacing: "-0.03em", marginBottom: 3 }}>
              {R.label}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: R.color, opacity: 0.75, marginBottom: 10 }}>
              Combined Score: {overallScore}
            </div>
            <p style={{ fontSize: 12.5, color: "var(--text-sec)", margin: 0, lineHeight: 1.55 }}>{R.msg}</p>
          </Card>

          {radarData.length > 0 && (
            <Card style={{ padding: "18px 14px", flexShrink: 0 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)", margin: "0 0 10px" }}>
                Indicator Breakdown
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData} margin={{ top: 4, right: 16, bottom: 4, left: 16 }}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "var(--text-sec)", fontFamily: "Inter" }} />
                  <Radar dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2} dot={{ r: 3, fill: "#6366f1" }} />
                  <Tooltip contentStyle={{
                    background: "var(--surface)", border: "1px solid var(--border)",
                    borderRadius: 8, fontSize: 12, fontFamily: "Inter", color: "var(--text)",
                  }} />
                </RadarChart>
              </ResponsiveContainer>
            </Card>
          )}

        </div>

        {/* ── Right column ── */}
        <div className="no-scrollbar" style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>

          {handwriting && (
            <Card style={{ padding: "20px 22px", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--primary-subtle)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <PenLine size={14} color="var(--primary)" />
                </div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: 0 }}>Handwriting Analysis</h3>
                <span style={{
                  marginLeft: "auto", fontSize: 11, fontWeight: 600,
                  padding: "3px 9px", borderRadius: 999,
                  background: RISK[getHwRisk(hwScore)].subtle,
                  color: RISK[getHwRisk(hwScore)].color,
                  border: `1px solid ${RISK[getHwRisk(hwScore)].border}`,
                }}>
                  {RISK[getHwRisk(hwScore)].label} · {hwScore}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {[
                  { label: "Letter Reversals",   val: handwriting.indicators?.reversal_score, max: 4 },
                  { label: "Spacing Issues",     val: handwriting.indicators?.spacing_score,  max: 3 },
                  { label: "Size Inconsistency", val: handwriting.indicators?.size_score,     max: 3 },
                  { label: "Baseline Drift",     val: handwriting.indicators?.baseline_score, max: 2 },
                  { label: "Stroke Variance",    val: handwriting.indicators?.stroke_score,   max: 2 },
                  { label: "Slant Consistency",  val: handwriting.indicators?.slant_score,    max: 2 },
                ].map((item, i) => (
                  <div key={i} style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 8px", textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "var(--primary)", letterSpacing: "-0.04em", lineHeight: 1 }}>{item.val ?? "–"}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>/ {item.max}</div>
                    <div style={{ fontSize: 10.5, color: "var(--text-sec)", marginTop: 5, lineHeight: 1.4 }}>{item.label}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {letters && (
            <Card style={{ padding: "20px 22px", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--primary-subtle)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Type size={14} color="var(--primary)" />
                </div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: 0 }}>Letter Analysis</h3>
                {!letters.model_loaded && (
                  <span style={{
                    marginLeft: "auto", fontSize: 10, fontWeight: 600,
                    padding: "2px 8px", borderRadius: 999,
                    background: "var(--warning-subtle)", color: "var(--warning)",
                    border: "1px solid var(--warning-border)",
                  }}>
                    CV mode — CNN pending
                  </span>
                )}
                {letters.model_loaded && (
                  <span style={{
                    marginLeft: "auto", fontSize: 10, fontWeight: 600,
                    padding: "2px 8px", borderRadius: 999,
                    background: "var(--primary-subtle)", color: "var(--primary)",
                    border: "1px solid var(--primary-border)",
                  }}>
                    EfficientNet-B0
                  </span>
                )}
              </div>

              {/* Reversal summary */}
              <div style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "12px 16px", borderRadius: 10, marginBottom: 14,
                background: letters.reversal_count > 0 ? "var(--danger-subtle)" : "var(--success-subtle)",
                border: `1px solid ${letters.reversal_count > 0 ? "var(--danger-border)" : "var(--success-border)"}`,
              }}>
                <div style={{
                  fontSize: 32, fontWeight: 800, lineHeight: 1,
                  color: letters.reversal_count > 0 ? "var(--danger)" : "var(--success)",
                }}>
                  {letters.reversal_count}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                    Letter Reversal{letters.reversal_count !== 1 ? "s" : ""} Detected
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--text-sec)", marginTop: 2 }}>
                    {letters.reversal_count === 0
                      ? "No reversals found across all 5 words"
                      : "Letters written in reversed orientation"}
                  </div>
                </div>
              </div>

              {/* Per-word breakdown */}
              {letters.words && letters.words.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {letters.words.map((wordResult, wi) => (
                    <div key={wi} style={{
                      padding: "10px 12px", borderRadius: 8,
                      background: "var(--bg-subtle)", border: "1px solid var(--border)",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span style={{
                          fontSize: 15, fontWeight: 800, color: "var(--primary)",
                          fontFamily: "Georgia, serif", minWidth: 36,
                        }}>
                          {wordResult.word}
                        </span>
                        {wordResult.error
                          ? <span style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>{wordResult.error}</span>
                          : wordResult.letters.map((l, li) => (
                            <span key={li} style={{
                              fontSize: 13, fontWeight: 700, padding: "2px 8px",
                              borderRadius: 6,
                              background: l.class === "Reversal"
                                ? "var(--danger-subtle)"
                                : l.class === "Corrected"
                                ? "var(--warning-subtle)"
                                : "var(--success-subtle)",
                              color: l.class === "Reversal"
                                ? "var(--danger)"
                                : l.class === "Corrected"
                                ? "var(--warning)"
                                : "var(--success)",
                              border: `1px solid ${l.class === "Reversal"
                                ? "var(--danger-border)"
                                : l.class === "Corrected"
                                ? "var(--warning-border)"
                                : "var(--success-border)"}`,
                              title: `${l.class} (${Math.round(l.confidence * 100)}%)`,
                            }}>
                              {l.letter}
                            </span>
                          ))
                        }
                      </div>
                      {!wordResult.error && (
                        <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 10.5, color: "var(--text-muted)" }}>
                          <span style={{ color: "var(--success)" }}>● Normal</span>
                          <span style={{ color: "var(--danger)" }}>● Reversal</span>
                          <span style={{ color: "var(--warning)" }}>● Corrected</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {speech && (
            <Card style={{ padding: "20px 22px", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(139,92,246,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Mic size={14} color="var(--violet)" />
                </div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: 0 }}>Speech Analysis</h3>
                <span style={{
                  marginLeft: "auto", fontSize: 11, fontWeight: 600,
                  padding: "3px 9px", borderRadius: 999,
                  background: RISK[getSpRisk(spScore)].subtle,
                  color: RISK[getSpRisk(spScore)].color,
                  border: `1px solid ${RISK[getSpRisk(spScore)].border}`,
                }}>
                  {RISK[getSpRisk(spScore)].label} · {spScore}
                </span>
              </div>
              {speech.transcription && (
                <div style={{
                  background: "var(--bg-subtle)", border: "1px solid var(--border)",
                  borderRadius: 9, padding: "10px 14px", marginBottom: 14,
                  lineHeight: 1.6,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4, display: "flex", justifyContent: "space-between" }}>
                    <span>TRANSCRIPTION</span>
                    {speech.transcript_source && (
                      <span style={{
                        padding: "1px 7px", borderRadius: 999, fontSize: 10,
                        background: speech.transcript_source === "browser" ? "var(--success-subtle)" : "var(--primary-subtle)",
                        color: speech.transcript_source === "browser" ? "var(--success)" : "var(--primary)",
                        border: `1px solid ${speech.transcript_source === "browser" ? "var(--success-border)" : "var(--primary-border)"}`,
                      }}>
                        {speech.transcript_source === "browser" ? "Browser" : "Whisper"}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12.5, fontStyle: "italic", color: "var(--text-sec)" }}>
                    "{speech.transcription}"
                  </div>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {[
                  {
                    label: "Words / Min",
                    val: speech.indicators?.words_per_minute,
                    warn: speech.indicators?.wpm_reliable === false,
                  },
                  { label: "Word Error Rate", val: speech.indicators?.wer_percent != null ? `${speech.indicators.wer_percent}%` : "–" },
                  { label: "Pause Count",     val: speech.indicators?.pause_count },
                ].map((item, i) => (
                  <div key={i} style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 8px", textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: item.warn ? "var(--warning)" : "var(--violet)", letterSpacing: "-0.04em", lineHeight: 1 }}>{item.val ?? "–"}</div>
                    <div style={{ fontSize: 10.5, color: "var(--text-sec)", marginTop: 6, lineHeight: 1.4 }}>{item.label}</div>
                    {item.warn && <div style={{ fontSize: 9.5, color: "var(--warning)", marginTop: 3 }}>unreliable (high WER)</div>}
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div style={{
            display: "flex", alignItems: "flex-start", gap: 10, flexShrink: 0,
            padding: "12px 16px", borderRadius: 10,
            background: "var(--warning-subtle)", border: "1px solid var(--warning-border)",
          }}>
            <ShieldCheck size={13} color="var(--warning)" style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: 12, color: "var(--warning-text)", margin: 0, lineHeight: 1.6 }}>
              <strong>Disclaimer:</strong> This tool provides a preliminary screening only and does not replace clinical diagnosis by a certified educational psychologist or speech-language pathologist.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
