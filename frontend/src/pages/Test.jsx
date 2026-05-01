import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PenLine, Mic, BarChart3, Check, BookOpen, Info, ScanLine, AlignLeft, Ruler, Baseline, Type } from "lucide-react";
import StepHandwriting from "../components/StepHandwriting";
import StepLetters from "../components/StepLetters";
import StepSpeech from "../components/StepSpeech";

const steps = [
  { number: 1, label: "Handwriting", icon: PenLine },
  { number: 2, label: "Letters",     icon: Type },
  { number: 3, label: "Speech",      icon: Mic },
  { number: 4, label: "Results",     icon: BarChart3 },
];

const PASSAGE = `When the sunlight strikes raindrops in the air, they act as a prism and form a rainbow. The rainbow is a division of white light into many beautiful colors. These take the shape of a long round arch, with its path high above and its two ends apparently beyond the horizon.`;

const hwChecks = [
  { icon: ScanLine, label: "Letter Reversals",    desc: "Detects b/d, p/q asymmetry patterns" },
  { icon: AlignLeft,label: "Spacing Irregularity",desc: "Measures coefficient of variation in gaps" },
  { icon: Ruler,    label: "Size Inconsistency",  desc: "Compares height variation across letters" },
  { icon: Baseline, label: "Baseline Drift",      desc: "Tracks vertical centroid deviation" },
];

export default function Test() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [handwritingResult, setHandwritingResult] = useState(null);
  const [lettersResult, setLettersResult]         = useState(null);

  const handleHandwritingDone = (result) => {
    setHandwritingResult(result);
    setCurrentStep(2);
  };

  const handleLettersDone = (result) => {
    setLettersResult(result);
    setCurrentStep(3);
  };

  const handleSpeechDone = (result) => {
    const record = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      handwriting: handwritingResult,
      letters: lettersResult,
      speech: result,
    };
    const prev = JSON.parse(localStorage.getItem("dyslexia_results") || "[]");
    localStorage.setItem("dyslexia_results", JSON.stringify([record, ...prev].slice(0, 20)));
    navigate("/results", { state: { handwriting: handwritingResult, letters: lettersResult, speech: result } });
  };

  return (
    <div style={{
      maxWidth: 1060, margin: "0 auto",
      padding: "44px 24px",
      display: "grid",
      gridTemplateColumns: "320px 1fr",
      gap: 28,
      alignItems: "start",
    }}>

      {/* ── Left panel ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20, position: "sticky", top: 84 }}>

        {/* Step progress (vertical) */}
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 16, padding: "24px 20px",
          boxShadow: "var(--shadow-sm)",
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", margin: "0 0 18px" }}>
            Progress
          </p>
          {steps.map(({ number, label, icon: Icon }, i) => {
            const done   = currentStep > number;
            const active = currentStep === number;
            return (
              <div key={number}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: done || active ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "var(--surface-raised)",
                    border: `2px solid ${done || active ? "transparent" : "var(--border)"}`,
                    boxShadow: active ? "0 0 0 4px var(--primary-subtle)" : "none",
                  }}>
                    {done
                      ? <Check size={15} color="white" strokeWidth={3} />
                      : <Icon size={14} color={active ? "white" : "var(--text-muted)"} />}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: done || active ? "var(--text)" : "var(--text-muted)" }}>
                      {label}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {done ? "Complete" : active ? "In progress" : "Pending"}
                    </div>
                  </div>
                </div>
                {i < steps.length - 1 && (
                  <div style={{
                    width: 2, height: 20, margin: "4px 0 4px 17px",
                    background: currentStep > number ? "var(--primary)" : "var(--border)",
                    borderRadius: 2,
                  }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Contextual info panel */}
        {currentStep === 1 && (
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 16, padding: "24px 20px",
            boxShadow: "var(--shadow-sm)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--primary-subtle)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Info size={13} color="var(--primary)" />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>What we analyze</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {hwChecks.map(({ icon: Icon, label, desc }, i) => (
                <div key={i} style={{ display: "flex", gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--surface-raised)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={13} color="var(--text-sec)" />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 1 }}>{label}</div>
                    <div style={{ fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.5 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: 18, padding: "12px 14px", borderRadius: 10,
              background: "var(--success-subtle)", border: "1px solid var(--success-border)",
            }}>
              <p style={{ fontSize: 12, color: "var(--success-text)", margin: 0, lineHeight: 1.6 }}>
                <strong>Tip:</strong> Write <em>"The quick brown fox jumps over the lazy dog"</em> on plain white paper and take a clear photo.
              </p>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 16, padding: "24px 20px",
            boxShadow: "var(--shadow-sm)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--primary-subtle)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Info size={13} color="var(--primary)" />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>What we test</span>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-sec)", lineHeight: 1.7, margin: "0 0 14px" }}>
              Write each of the 5 words shown in the box. These words are chosen to contain letters that dyslexic children commonly reverse.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { word: "bed",  note: "b and d — most common reversal pair" },
                { word: "dog",  note: "d and g" },
                { word: "pup",  note: "p — often reversed to q" },
                { word: "quit", note: "q — often confused with p or d" },
                { word: "mum",  note: "m — baseline consistency" },
              ].map(({ word, note }) => (
                <div key={word} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{
                    fontSize: 15, fontWeight: 800, color: "var(--primary)",
                    fontFamily: "Georgia, serif", minWidth: 36,
                  }}>{word}</span>
                  <span style={{ fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.5 }}>{note}</span>
                </div>
              ))}
            </div>
            <div style={{
              marginTop: 16, padding: "10px 14px", borderRadius: 10,
              background: "var(--success-subtle)", border: "1px solid var(--success-border)",
            }}>
              <p style={{ fontSize: 12, color: "var(--success-text)", margin: 0, lineHeight: 1.6 }}>
                <strong>Tip:</strong> Use a mouse or touchscreen. Write at your normal size and speed.
              </p>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 16, padding: "24px 20px",
            boxShadow: "var(--shadow-sm)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: "rgba(139,92,246,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <BookOpen size={13} color="var(--violet)" />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Read this passage aloud</span>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.85, color: "var(--text)", margin: "0 0 16px" }}>
              {PASSAGE}
            </p>
            <div style={{
              padding: "10px 14px", borderRadius: 10,
              background: "var(--primary-subtle)", border: "1px solid var(--primary-border)",
            }}>
              <p style={{ fontSize: 12, color: "var(--primary-text)", margin: 0, lineHeight: 1.6 }}>
                Read clearly at your <strong>natural pace</strong>. Don't rush — normal speed gives the most accurate results.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Right panel — form card ── */}
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 20,
        boxShadow: "var(--shadow-md)",
        padding: "36px",
        minWidth: 0,        /* prevents grid column from expanding to fit overflow content */
        overflow: "hidden",
      }}>
        {currentStep === 1 && <StepHandwriting onDone={handleHandwritingDone} hideTip />}
        {currentStep === 2 && <StepLetters onDone={handleLettersDone} />}
        {currentStep === 3 && <StepSpeech onDone={handleSpeechDone} hidePassage />}
      </div>

    </div>
  );
}
