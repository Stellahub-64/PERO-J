export default function Footer() {
  const version = import.meta.env.VITE_APP_VERSION || "dev";
  const sha = import.meta.env.VITE_COMMIT_SHA || "local";
  const shortSha = sha.slice(0, 7);

  return (
    <footer
      style={{
        borderTop: "1px solid var(--border)",
        padding: "12px 24px",
        color: "var(--muted)",
        fontSize: 13,
        textAlign: "center",
      }}
    >
      <span aria-label="App version">
        v{version} ({shortSha})
      </span>
    </footer>
  );
}
