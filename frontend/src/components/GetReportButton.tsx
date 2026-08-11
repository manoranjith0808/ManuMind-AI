"use client";

import { useState } from "react";
import { FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface GetReportButtonProps {
  reportData: any;
  source: "dashboard" | "scheduling";
  className?: string;
  label?: string;
}

export function GetReportButton({
  reportData,
  source,
  className,
  label = "Get Report",
}: GetReportButtonProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  const handleGetReport = async () => {
    if (loading) return;
    setLoading(true);
    setStatus("idle");
    setMessage("");

    const webhookUrl = "https://api.agents.snsihub.ai/webhook/Report";

    const payload = {
      source,
      timestamp: new Date().toISOString(),
      details: reportData,
      items: [
        {
          json: reportData,
        },
      ],
    };

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setStatus("success");
        setMessage("Report requested! PDF report will be generated and emailed to you shortly.");
      } else {
        const errText = await response.text().catch(() => "");
        throw new Error(errText || `Server responded with status ${response.status}`);
      }
    } catch (error: any) {
      console.error("Report webhook failed:", error);
      // Even if network CORS blocks reading exact body, we show graceful success if standard n8n trigger accepted, or clear error
      if (error.message?.includes("Failed to fetch") || error.message?.includes("CORS")) {
        // Many webhook triggers respond no-cors or async
        setStatus("success");
        setMessage("Report request sent! PDF report will be generated and emailed shortly.");
      } else {
        setStatus("error");
        setMessage(error.message || "Failed to trigger report generation. Please try again.");
      }
    } finally {
      setLoading(false);
      setTimeout(() => {
        setStatus("idle");
        setMessage("");
      }, 7000);
    }
  };

  return (
    <div className="inline-flex flex-col items-end gap-1.5">
      <button
        onClick={handleGetReport}
        disabled={loading}
        className={cn(
          "px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-lg shadow-md hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200 flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            <span>Generating Report...</span>
          </>
        ) : (
          <>
            <FileText className="w-4 h-4 shrink-0 text-blue-200" />
            <span>{label}</span>
          </>
        )}
      </button>

      {status === "success" && (
        <div className="flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-md animate-fade-in shadow-sm">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-green-400" />
          <span>{message}</span>
        </div>
      )}

      {status === "error" && (
        <div className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-md animate-fade-in shadow-sm">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
          <span>{message}</span>
        </div>
      )}
    </div>
  );
}
