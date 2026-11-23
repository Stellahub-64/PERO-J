import { useEffect } from "react";

export default function Toast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const timeout = window.setTimeout(onClose, 5000);
    return () => window.clearTimeout(timeout);
  }, [onClose]);

  return (
    <div role="alert" className="toast">
      <span>{message}</span>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={onClose}
        style={{ padding: "2px 8px", background: "transparent", color: "var(--text)" }}
      >
        x
      </button>
    </div>
  );
}
