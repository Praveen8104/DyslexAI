import { BookOpen, PenLine, Volume2, Brain, Clock, ThumbsDown, CheckCircle, XCircle, Star } from "lucide-react";

const signs = [
  { icon: BookOpen,   title: "Reading Difficulties", desc: "Slow, inaccurate reading; difficulty sounding out words",      color: "#6366f1" },
  { icon: PenLine,    title: "Writing Problems",      desc: "Letter reversals (b/d, p/q), inconsistent spelling",           color: "#8b5cf6" },
  { icon: Volume2,    title: "Phonological Issues",   desc: "Difficulty connecting sounds to letters",                      color: "#06b6d4" },
  { icon: Brain,      title: "Memory Challenges",     desc: "Difficulty remembering sequences of letters or numbers",       color: "#f59e0b" },
  { icon: Clock,      title: "Slow Processing",       desc: "Takes longer to read or write compared to peers",              color: "#ef4444" },
  { icon: ThumbsDown, title: "Low Confidence",        desc: "Avoidance of reading tasks, frustration with school",          color: "#10b981" },
];

const myths = [
  { myth: "Dyslexia means seeing words backwards",  fact: "It is a language processing issue, not a vision problem" },
  { myth: "Dyslexic people are not intelligent",    fact: "Dyslexia is unrelated to IQ — many are highly intelligent" },
  { myth: "Children grow out of dyslexia",          fact: "It is lifelong, but early intervention greatly helps" },
  { myth: "Dyslexia is rare",                       fact: "15–20% of the population has some form of dyslexia" },
];

const notable = ["Albert Einstein", "Leonardo da Vinci", "Steve Jobs", "Elon Musk", "Agatha Christie", "Richard Branson", "Whoopi Goldberg", "Steven Spielberg"];

const Card = ({ children, style = {} }) => (
  <div style={{
    background: "var(--surface)", border: "1px solid var(--border)",
    borderRadius: 16, boxShadow: "var(--shadow-sm)", ...style,
  }}>
    {children}
  </div>
);

export default function About() {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px" }}>

      <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text)", margin: "0 0 8px" }}>
        About Dyslexia
      </h1>
      <p style={{ fontSize: 15, color: "var(--text-sec)", margin: "0 0 40px" }}>
        Understanding dyslexia is the first step towards early detection and support.
      </p>

      {/* What is dyslexia */}
      <Card style={{ padding: 32, marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9,
            background: "var(--primary-subtle)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Brain size={17} color="var(--primary)" />
          </div>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", margin: 0, letterSpacing: "-0.02em" }}>
            What is Dyslexia?
          </h2>
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.75, color: "var(--text-sec)", margin: "0 0 12px" }}>
          Dyslexia is a <strong style={{ color: "var(--text)" }}>neurological learning difference</strong> that primarily affects reading, spelling, and writing. It is caused by differences in how the brain processes language — particularly the ability to connect letters to their sounds (phonological processing).
        </p>
        <p style={{ fontSize: 14, lineHeight: 1.75, color: "var(--text-sec)", margin: 0 }}>
          It is <strong style={{ color: "var(--text)" }}>not</strong> caused by lack of intelligence, poor teaching, or laziness. With early detection and proper support, people with dyslexia can thrive academically and professionally.
        </p>
      </Card>

      {/* Signs */}
      <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", margin: "0 0 16px", letterSpacing: "-0.02em" }}>
        Common Signs
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 36 }}>
        {signs.map(({ icon: Icon, title, desc, color }, i) => (
          <Card key={i} style={{ padding: 20 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 9,
              background: `${color}15`,
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 14,
            }}>
              <Icon size={17} color={color} />
            </div>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", margin: "0 0 6px" }}>{title}</h3>
            <p style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--text-sec)", margin: 0 }}>{desc}</p>
          </Card>
        ))}
      </div>

      {/* Myths vs Facts */}
      <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", margin: "0 0 16px", letterSpacing: "-0.02em" }}>
        Myths vs Facts
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 36 }}>
        {myths.map((m, i) => (
          <Card key={i} style={{ padding: 0, overflow: "hidden", display: "flex" }}>
            <div style={{ flex: 1, padding: "18px 20px", display: "flex", gap: 12, borderRight: "1px solid var(--border)" }}>
              <XCircle size={15} color="var(--danger)" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: "var(--danger)", marginBottom: 4 }}>MYTH</div>
                <div style={{ fontSize: 13, color: "var(--text-sec)", lineHeight: 1.5 }}>{m.myth}</div>
              </div>
            </div>
            <div style={{ flex: 1, padding: "18px 20px", display: "flex", gap: 12 }}>
              <CheckCircle size={15} color="var(--success)" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: "var(--success)", marginBottom: 4 }}>FACT</div>
                <div style={{ fontSize: 13, color: "var(--text-sec)", lineHeight: 1.5 }}>{m.fact}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Notable people */}
      <Card style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <Star size={15} color="var(--warning)" />
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: 0 }}>
            Notable People with Dyslexia
          </h2>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {notable.map(name => (
            <span key={name} style={{
              fontSize: 13, fontWeight: 500, padding: "5px 12px", borderRadius: 999,
              background: "var(--tag-bg)", color: "var(--tag-text)",
              border: "1px solid var(--tag-border)",
            }}>
              {name}
            </span>
          ))}
        </div>
      </Card>

    </div>
  );
}
