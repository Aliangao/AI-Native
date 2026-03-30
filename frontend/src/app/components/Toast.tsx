"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";

interface ToastMessage {
  id: number;
  text: string;
  type: "success" | "error" | "info";
}

interface ToastContextType {
  toast: (text: string, type?: "success" | "error" | "info") => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let globalToastId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const toast = useCallback((text: string, type: "success" | "error" | "info" = "success") => {
    const id = ++globalToastId;
    setMessages((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setMessages((prev) => prev.filter((m) => m.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`pointer-events-auto px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 animate-slide-in
              ${msg.type === "success" ? "bg-green-600 text-white" : ""}
              ${msg.type === "error" ? "bg-red-600 text-white" : ""}
              ${msg.type === "info" ? "bg-gray-800 text-white" : ""}
            `}
          >
            <span>
              {msg.type === "success" && "✓"}
              {msg.type === "error" && "✕"}
              {msg.type === "info" && "ℹ"}
            </span>
            {msg.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
