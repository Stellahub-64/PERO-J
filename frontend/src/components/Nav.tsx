import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";

export default function Nav() {
  const [q, setQ] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "light";
    const stored = localStorage.getItem("theme");
    if (stored) return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const nav = useNavigate();

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.setAttribute("data-theme", "dark");
    } else {
      root.removeAttribute("data-theme");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }

  function search(e: React.FormEvent) {
    e.preventDefault();
    const v = q.trim();
    if (!v) return;
    if (v.startsWith("G") && v.length === 56) nav(`/wallet/${v}`);
    else nav(`/contract/${v}`);
    setQ("");
    setMenuOpen(false);
  }

  const linkStyle = (isActive: boolean) => ({
    fontWeight: 600,
    fontSize: 15,
    whiteSpace: "nowrap" as const,
    color: isActive ? "var(--accent)" : "inherit",
    borderBottom: isActive ? "2px solid var(--accent)" : "none",
    paddingBottom: isActive ? "4px" : "0px",
  });

  return (
    <header style={{
      background: "var(--surface)",
      borderBottom: "1px solid var(--border)",
      padding: "12px 24px",
      display: "flex",
      alignItems: "center",
      gap: 16,
    }}>
      <NavLink
        to="/"
        style={({ isActive }) => ({
          fontWeight: 700,
          fontSize: 16,
          whiteSpace: "nowrap",
          color: isActive ? "var(--accent)" : "inherit",
          borderBottom: isActive ? "2px solid var(--accent)" : "none",
          paddingBottom: isActive ? "4px" : "0px",
        })}
      >
        ⬡ Soroban Explorer
      </NavLink>
      <NavLink
        to="/bets"
        style={({ isActive }) => ({
          whiteSpace: "nowrap",
          color: isActive ? "var(--accent)" : "inherit",
          borderBottom: isActive ? "2px solid var(--accent)" : "none",
          paddingBottom: isActive ? "4px" : "0px",
        })}
      >
        Bets
      </NavLink>
      <form onSubmit={search} style={{ display: "flex", gap: 8, flex: 1, maxWidth: 600 }}>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search contract ID or wallet address…"
          style={{ flex: 1 }}
        />
        <button type="submit">Search</button>
      </form>
    <header className="nav-header">
      <div className="nav-bar">
        <NavLink
          to="/"
          onClick={() => setMenuOpen(false)}
          style={({ isActive }) => ({
            fontWeight: 700,
            fontSize: 16,
            whiteSpace: "nowrap",
            color: isActive ? "var(--accent)" : "inherit",
            borderBottom: isActive ? "2px solid var(--accent)" : "none",
            paddingBottom: isActive ? "4px" : "0px",
          })}
        >
          ⬡ Soroban Explorer
        </NavLink>
        <button
          type="button"
          className="nav-toggle"
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          ☰
        </button>
        <nav className={`nav-links${menuOpen ? " open" : ""}`}>
          <NavLink to="/contracts" onClick={() => setMenuOpen(false)} style={({ isActive }) => linkStyle(isActive)}>
            Contracts
          </NavLink>
          <form onSubmit={search} className="nav-search">
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search contract ID or wallet address…"
              style={{ flex: 1, minWidth: 0 }}
            />
            <button type="submit">Search</button>
          </form>
          <button type="button" onClick={toggleTheme} aria-label="Toggle dark mode" className="nav-theme">
            {theme === "dark" ? "Light" : "Dark"}
          </button>
        </nav>
      </div>
    </header>
  );
}
