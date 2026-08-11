"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { extractWebhookPayload } from "@/lib/webhookUtils";

/* ────────────────────────────────────────────────────────────────
   Shape definitions – add more pages here as needed
──────────────────────────────────────────────────────────────── */

interface ChatState {
  messages: { role: string; content: string; timestamp: string }[];
}

interface SchedulingState {
  result: any;
  rawResponse: string | null;
  formData: {
    production_target: number;
    product_type: string;
    start_time: string;
    delivery_deadline: string;
    available_machines: string[];
    active_shifts: { morning: boolean; afternoon: boolean; night: boolean };
  };
}

interface UploadState {
  sheetUrl: string;
  webhookData: any;
  status: "idle" | "loading" | "success" | "error";
  message: string;
}

interface AppPageState {
  chat: ChatState;
  scheduling: SchedulingState;
  upload: UploadState;
}

interface AppStateContextType {
  state: AppPageState;
  setChatState: (s: Partial<ChatState>) => void;
  setSchedulingState: (s: Partial<SchedulingState>) => void;
  setUploadState: (s: Partial<UploadState>) => void;
}

/* ────────────────────────────────────────────────────────────────
   Defaults
──────────────────────────────────────────────────────────────── */

const defaultChat: ChatState = {
  messages: [
    {
      role: "assistant",
      content:
        "Hello! I am ManuMind AI, your manufacturing intelligence assistant. Ask me anything about your production data.",
      timestamp: new Date().toISOString(),
    },
  ],
};

const defaultScheduling: SchedulingState = {
  result: null,
  rawResponse: null,
  formData: {
    production_target: 500,
    product_type: "Product A",
    start_time: "",
    delivery_deadline: "",
    available_machines: ["M101", "M102", "M103", "M104", "M105", "M106"],
    active_shifts: { morning: true, afternoon: true, night: false },
  },
};

const defaultUpload: UploadState = {
  sheetUrl: "",
  webhookData: null,
  status: "idle",
  message: "",
};

/* ────────────────────────────────────────────────────────────────
   Context
──────────────────────────────────────────────────────────────── */

const AppStateContext = createContext<AppStateContextType | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [chat, setChat] = useState<ChatState>(defaultChat);
  const [scheduling, setScheduling] = useState<SchedulingState>(defaultScheduling);
  const [upload, setUpload] = useState<UploadState>(defaultUpload);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("manumind_webhook_data");
      if (stored) {
        const parsed = JSON.parse(stored);
        const normalized = extractWebhookPayload(parsed);
        if (normalized) {
          setUpload((prev) => ({ ...prev, webhookData: normalized }));
        }
      }
    } catch (e) {
      console.error("Failed to restore webhook data from localStorage", e);
    }
  }, []);

  const setChatState = (s: Partial<ChatState>) =>
    setChat((prev) => ({ ...prev, ...s }));

  const setSchedulingState = (s: Partial<SchedulingState>) =>
    setScheduling((prev) => ({ ...prev, ...s }));

  const setUploadState = (s: Partial<UploadState>) =>
    setUpload((prev) => {
      const next = { ...prev, ...s };
      if (s.webhookData !== undefined) {
        if (s.webhookData) {
          try {
            localStorage.setItem("manumind_webhook_data", JSON.stringify(s.webhookData));
          } catch (e) {
            console.error("Failed to save webhook data to localStorage", e);
          }
        } else {
          try {
            localStorage.removeItem("manumind_webhook_data");
          } catch (e) {}
        }
      }
      return next;
    });

  return (
    <AppStateContext.Provider
      value={{
        state: { chat, scheduling, upload },
        setChatState,
        setSchedulingState,
        setUploadState,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

/* ────────────────────────────────────────────────────────────────
   Hooks
──────────────────────────────────────────────────────────────── */

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used inside AppStateProvider");
  return ctx;
}
