import { useNavigate } from "react-router-dom";
import { Clock, Trash2, ChevronRight, CheckCircle, AlertTriangle, XCircle, Inbox } from "lucide-react";

const RISK = {
  Low:    { color: "#10b981", subtle: "rgba(16,185,129,0.08)",  icon: CheckCircle },
  Medium: { color: "#f59e0b", subtle: "rgba(245,158,11,0.08)",  icon: AlertTriangle },
  High:   { color: "#ef4444", subtle: "rgba(239,68,68,0.08)",   icon: XCircle },
};
const getRisk = s => s >= 8 ? "High" : s >= 4 ? "Medium" : "Low";

export default function History() {
  const navigate = useNavigate();
  const records = JSON.parse(localStorage.getItem("dyslexia_results") || "[]");

  const clearAll = () => {
    localStorage.removeItem("dyslexia_results");
    window.location.reload();
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text)", margin: "0 0 4px" }}>
            Test History
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-sec)", margin: 0 }}>
            {records.length} saved result{records.length !== 1 ? "s" : ""}
          </p>
        </div>
        {records.length > 0 && (
          <button onClick={clearAll} style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "8px 14px", borderRadius: 8, cursor: "pointer",
            fontSize: 13, fontWeight: 600,
            color: "var(--danger)", background: "var(--danger-subtle)",
            border: "1px solid var(--danger-border)",
          }}>
            <Trash2 size={13} /> Clear All
          </button>
        )}
      </div>

      {records.length === 0 ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", padding: "80px 0", textAlign: "center",
        }}>
          <div style={{
            width: 60, height: 60, borderRadius: 14,
            background: "var(--surface-raised)",
            border: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 20,
          }}>
            <Inbox size={26} color="var(--text-muted)" />
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", margin: "0 0 8px" }}>No results yet</h3>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 24 }}>
            Complete a test to see your results history here.
          </p>
          <button onClick={() => navigate("/test")} style={{
            padding: "10px 24px", borderRadius: 10,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            color: "white", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer",
          }}>
            Start a Test
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {records.map((rec, i) => {
            const hwScore = rec.handwriting?.total_score ?? null;
            const ltScore = rec.letters?.reversal_count ?? null;
            const spScore = rec.speech?.total_score ?? null;
            const scores  = [hwScore, spScore].filter(s => s !== null);
            const overall = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
            const risk  = overall !== null ? getRisk(overall) : "Low";
            const R     = RISK[risk];
            const RIcon = R.icon;

            return (
              <div key={rec.id}
                onClick={() => navigate("/results", { state: { handwriting: rec.handwriting, letters: rec.letters, speech: rec.speech } })}
                style={{
                  background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: 14, padding: "18px 20px",
                  display: "flex", alignItems: "center", gap: 14,
                  cursor: "pointer", boxShadow: "var(--shadow-xs)",
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = "var(--shadow-sm)"}
                onMouseLeave={e => e.currentTarget.style.boxShadow = "var(--shadow-xs)"}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                  background: R.subtle,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <RIcon size={20} color={R.color} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
                      Test #{records.length - i}
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999,
                      background: R.subtle, color: R.color,
                    }}>
                      {risk} Risk
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 14, fontSize: 12, color: "var(--text-muted)" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Clock size={11} /> {rec.date}
                    </span>
                    {hwScore !== null && <span>Handwriting: {hwScore}</span>}
                    {ltScore !== null && <span>Reversals: {ltScore}</span>}
                    {spScore !== null && <span>Speech: {spScore}</span>}
                  </div>
                </div>
                <div style={{ textAlign: "center", marginRight: 4 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: R.color, letterSpacing: "-0.03em" }}>{overall}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Score</div>
                </div>
                <ChevronRight size={16} color="var(--text-muted)" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
