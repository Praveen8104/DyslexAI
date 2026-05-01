import { useNavigate } from "react-router-dom";
import { PenLine, Mic, BarChart3, ArrowRight, ShieldCheck, Brain, Users, Sparkles, Type, Cpu } from "lucide-react";

const steps = [
  {
    n: "01", icon: PenLine, color: "#6366f1",
    title: "Upload Handwriting",
    desc: "Upload a photo of a handwriting sample. OpenCV analyzes 6 indicators — letter reversals, spacing, size, baseline, stroke width, and slant.",
  },
  {
    n: "02", icon: Type, color: "#8b5cf6",
    title: "Letter Writing Test",
    desc: "Write 5 short diagnostic words on a canvas. EfficientNet-B0 classifies each letter as Normal, Reversed, or Corrected — detecting b/d and p/q confusions.",
  },
  {
    n: "03", icon: Mic, color: "#06b6d4",
    title: "Record Speech",
    desc: "Read the Rainbow Passage aloud. Whisper AI transcribes your recording and scores fluency, reading speed, pause patterns, and phoneme accuracy.",
  },
  {
    n: "04", icon: BarChart3, color: "#10b981",
    title: "Get Your Report",
    desc: "Receive an instant multi-indicator risk assessment with a radar chart breakdown and a downloadable PDF report.",
  },
];

const stats = [
  { icon: Users,      value: "15–20%", label: "of the population has dyslexia" },
  { icon: ShieldCheck,value: "80%",    label: "of cases go undetected in childhood" },
  { icon: Brain,      value: "4×",     label: "better outcomes with early screening" },
];

const features = [
  { title: "Computer Vision",    desc: "OpenCV analyzes 6 handwriting indicators including stroke width variance and slant inconsistency.", icon: PenLine,    color: "#6366f1" },
  { title: "EfficientNet-B0",    desc: "CNN trained on 150k+ real dyslexic children's handwriting samples for letter reversal detection.",  icon: Cpu,        color: "#8b5cf6" },
  { title: "Whisper AI",         desc: "Groq's Whisper Large v3 transcribes speech with near-human accuracy across accents.",              icon: Mic,        color: "#06b6d4" },
  { title: "PDF Reports",        desc: "Download a full assessment report with all indicators to share with a specialist.",                icon: BarChart3,  color: "#10b981" },
  { title: "100% Private",       desc: "No accounts. No cloud storage. All results stay on your device.",                                 icon: ShieldCheck,color: "#f59e0b" },
  { title: "Preliminary Only",   desc: "Designed as a screening tool — not a clinical diagnosis. Always consult a specialist.",           icon: Brain,      color: "#ef4444" },
];

const S = {
  // shared card style
  card: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    boxShadow: "var(--shadow-sm)",
  },
};

export default function Home() {
  const navigate = useNavigate();

  return (
    <div style={{ background: "var(--bg)" }}>

      {/* ─── Hero ─── */}
      <section style={{
        maxWidth: 1120, margin: "0 auto",
        padding: "96px 24px 80px",
        display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
        position: "relative",
      }}>
        {/* subtle top glow */}
        <div style={{
          position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
          width: 600, height: 300, borderRadius: "50%", pointerEvents: "none",
          background: "radial-gradient(ellipse, rgba(99,102,241,0.1) 0%, transparent 70%)",
        }} />

        {/* Badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "5px 14px", borderRadius: 999,
          background: "var(--primary-subtle)",
          border: "1px solid var(--primary-border)",
          color: "var(--primary-text)", fontSize: 12, fontWeight: 600,
          marginBottom: 28, position: "relative",
        }}>
          <Sparkles size={11} />
          AI-Powered · Multimodal · Free
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: "clamp(2.6rem, 5.5vw, 4rem)",
          fontWeight: 900, lineHeight: 1.1,
          letterSpacing: "-0.04em",
          color: "var(--text)",
          maxWidth: 760, margin: "0 0 20px",
          position: "relative",
        }}>
          Early Dyslexia Detection{" "}
          <span style={{
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>Powered by AI</span>
        </h1>

        <p style={{
          fontSize: 17, lineHeight: 1.7,
          color: "var(--text-sec)",
          maxWidth: 520, margin: "0 0 40px",
          position: "relative",
        }}>
          Analyze handwriting and speech in minutes to identify dyslexia indicators.
          Built for children and adults — free, private, and no sign-up required.
        </p>

        {/* CTAs */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", position: "relative" }}>
          <button onClick={() => navigate("/test")} style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "12px 28px", borderRadius: 10,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            color: "white", fontWeight: 700, fontSize: 15,
            border: "none", cursor: "pointer",
            boxShadow: "0 4px 20px rgba(99,102,241,0.35)",
          }}>
            Start Assessment <ArrowRight size={16} />
          </button>
          <button onClick={() => navigate("/about")} style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "12px 28px", borderRadius: 10,
            background: "var(--surface)",
            color: "var(--text-sec)", fontWeight: 600, fontSize: 15,
            border: "1px solid var(--border)", cursor: "pointer",
          }}>
            Learn About Dyslexia
          </button>
        </div>

        {/* Trust note */}
        <p style={{ marginTop: 24, fontSize: 12, color: "var(--text-muted)", position: "relative" }}>
          No account required · Results stay on your device · Not a clinical diagnosis
        </p>
      </section>

      {/* ─── Stats ─── */}
      <section style={{
        borderTop: "1px solid var(--border)",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-subtle)",
      }}>
        <div style={{
          maxWidth: 1120, margin: "0 auto",
          padding: "40px 24px",
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
          gap: 32,
        }}>
          {stats.map(({ icon: Icon, value, label }, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                background: "var(--primary-subtle)",
                border: "1px solid var(--primary-border)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon size={18} color="var(--primary)" />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.03em" }}>{value}</div>
                <div style={{ fontSize: 13, color: "var(--text-sec)", marginTop: 1 }}>{label}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "96px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--primary)", marginBottom: 12 }}>
            How It Works
          </p>
          <h2 style={{ fontSize: "clamp(1.75rem, 3vw, 2.25rem)", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text)", margin: 0 }}>
            Four steps to a full report
          </h2>
          <p style={{ fontSize: 15, color: "var(--text-sec)", marginTop: 12, maxWidth: 440, margin: "12px auto 0" }}>
            Complete both modules or just one — you get a full breakdown either way.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {steps.map(({ n, icon: Icon, color, title, desc }, i) => (
            <div key={i} style={{ ...S.card, padding: 32, position: "relative", overflow: "hidden" }}>
              {/* watermark */}
              <div style={{
                position: "absolute", top: 16, right: 20,
                fontSize: 56, fontWeight: 900, lineHeight: 1,
                color: "var(--border-strong)", letterSpacing: "-0.04em", userSelect: "none",
              }}>{n}</div>

              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: `${color}15`,
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 20,
              }}>
                <Icon size={20} color={color} />
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>
                Step {i + 1}
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: "0 0 10px", letterSpacing: "-0.02em" }}>
                {title}
              </h3>
              <p style={{ fontSize: 14, color: "var(--text-sec)", lineHeight: 1.65, margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 48 }}>
          <button onClick={() => navigate("/test")} style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "13px 32px", borderRadius: 10,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            color: "white", fontWeight: 700, fontSize: 15,
            border: "none", cursor: "pointer",
            boxShadow: "0 4px 20px rgba(99,102,241,0.3)",
          }}>
            Take the Assessment <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section style={{
        borderTop: "1px solid var(--border)",
        background: "var(--bg-subtle)",
      }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "80px 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--violet)", marginBottom: 12 }}>
              Under the Hood
            </p>
            <h2 style={{ fontSize: "clamp(1.75rem, 3vw, 2.25rem)", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text)", margin: 0 }}>
              Built on proven technology
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            {features.map(({ title, desc, icon: Icon, color }, i) => (
              <div key={i} style={{ ...S.card, padding: 24 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 8,
                  background: `${color}15`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 16,
                }}>
                  <Icon size={17} color={color} />
                </div>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: "0 0 8px", letterSpacing: "-0.01em" }}>
                  {title}
                </h4>
                <p style={{ fontSize: 13, color: "var(--text-sec)", lineHeight: 1.6, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Banner ─── */}
      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "80px 24px" }}>
        <div style={{
          borderRadius: 20,
          background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
          padding: "64px 48px",
          textAlign: "center",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            width: 600, height: 400, borderRadius: "50%", pointerEvents: "none",
            background: "radial-gradient(ellipse, rgba(255,255,255,0.08) 0%, transparent 70%)",
          }} />
          <div style={{ position: "relative" }}>
            <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.65)", marginBottom: 16 }}>
              Free · No Sign-up · Takes 5 minutes
            </p>
            <h2 style={{ fontSize: "clamp(1.75rem, 3vw, 2.5rem)", fontWeight: 800, color: "white", letterSpacing: "-0.03em", margin: "0 0 16px" }}>
              Ready to start the assessment?
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.75)", maxWidth: 440, margin: "0 auto 36px" }}>
              Get a comprehensive report with a full indicator breakdown you can download and share.
            </p>
            <button onClick={() => navigate("/test")} style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "13px 32px", borderRadius: 10,
              background: "white", color: "#6366f1",
              fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer",
              boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
            }}>
              Start Free Assessment <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Disclaimer */}
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 10,
          marginTop: 24, padding: "14px 18px", borderRadius: 10,
          background: "var(--warning-subtle)",
          border: "1px solid var(--warning-border)",
        }}>
          <ShieldCheck size={14} color="var(--warning)" style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: 12.5, color: "var(--warning-text)", margin: 0, lineHeight: 1.6 }}>
            <strong>Screening Tool Only:</strong> This application is for preliminary screening purposes only and does not replace clinical diagnosis by a certified educational psychologist or speech-language pathologist.
          </p>
        </div>
      </section>

    </div>
  );
}
