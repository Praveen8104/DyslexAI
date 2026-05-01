import { Link, useLocation } from "react-router-dom";
import { Brain, Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

const navLinks = [
  { path: "/",        label: "Home" },
  { path: "/test",    label: "Start Test" },
  { path: "/history", label: "History" },
  { path: "/about",   label: "About" },
];

export default function Navbar() {
  const location = useLocation();
  const { dark, toggle } = useTheme();

  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 50,
      background: "var(--nav-bg)",
      borderBottom: "1px solid var(--nav-border)",
      backdropFilter: "blur(12px)",
    }}>
      <div style={{
        maxWidth: 1120, margin: "0 auto",
        padding: "0 24px",
        height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>

        {/* Logo */}
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <Brain size={17} color="white" />
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", letterSpacing: "-0.02em" }}>
            DyslexiaDetect
          </span>
        </Link>

        {/* Nav links + toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          {navLinks.map(({ path, label }) => {
            const active = location.pathname === path;
            return (
              <Link key={path} to={path} style={{
                padding: "6px 14px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                color: active ? "var(--primary)" : "var(--text-sec)",
                background: active ? "var(--primary-subtle)" : "transparent",
                border: active ? "1px solid var(--primary-border)" : "1px solid transparent",
              }}>
                {label}
              </Link>
            );
          })}

          {/* Divider */}
          <div style={{ width: 1, height: 20, background: "var(--border)", margin: "0 8px" }} />

          {/* Theme toggle */}
          <button onClick={toggle} style={{
            width: 34, height: 34, borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--surface-raised)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "var(--text-sec)",
          }}>
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>

      </div>
    </nav>
  );
}
