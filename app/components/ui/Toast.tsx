"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { copy } from "@/lib/copy/en";

type Toast = { id: string; message: string; type?: "success" | "info" };

type ToastContextValue = {
  addToast: (message: string, type?: "success" | "info") => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: "success" | "info" = "info") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2600);
  }, []);

  const value = useMemo(() => ({ addToast }), [addToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-72 flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-xl border px-3 py-2 text-sm text-slate-100 shadow-lg backdrop-blur ${
              toast.type === "success"
                ? "border-emerald-400/60 bg-emerald-500/20"
                : "border-white/10 bg-white/10"
            }`}
            role="status"
            aria-label={copy.toast.aria}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
