import { useState } from "react";

interface CopyButtonProps {
  value: string;
  size?: "small" | "normal";
  ariaLabel: string;
}

export default function CopyButton({ value, size = "normal", ariaLabel }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      aria-label={ariaLabel}
      style={{
        padding: size === "small" ? "4px 8px" : "6px 12px",
        fontSize: size === "small" ? "12px" : "14px",
        minWidth: "auto",
        borderRadius: "4px",
        background: copied ? "var(--green)" : "var(--muted)",
        color: "#fff",
      }}
      title="Copy to clipboard"
    >
      {copied ? "✓ Copied!" : "📋 Copy"}
    </button>
  );
}
