export interface ToastMessage {
  id: number;
  type: "success" | "error";
  message: string;
}

export default function Toast({ toast }: { toast: ToastMessage | null }) {
  if (!toast) return null;
  return (
    <div
      role={toast.type === "error" ? "alert" : "status"}
      className={`toast ${toast.type}`}
    >
      {toast.message}
    </div>
  );
}
