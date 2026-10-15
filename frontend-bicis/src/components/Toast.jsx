import React, { useEffect } from "react";

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 3500);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  return (
    <div className="toast-container">
      <div className={`toast ${toast.type || "success"}`}>
        <span>{toast.type === "error" ? "❌" : "✅"}</span>
        <span>{toast.message}</span>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            color: "#ffffff",
            cursor: "pointer",
            marginLeft: "0.5rem",
            fontSize: "1rem"
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
