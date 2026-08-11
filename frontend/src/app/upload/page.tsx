"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Database, Table as TableIcon, Link2, CheckCircle2, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAppState } from "@/components/AppStateProvider";
import { extractWebhookPayload } from "@/lib/webhookUtils";

export default function UploadPage() {
  const { state, setUploadState } = useAppState();
  const router = useRouter();
  const { sheetUrl, status, message } = state.upload;

  const [datasets, setDatasets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void loadDatasets();
  }, []);

  const loadDatasets = async () => {
    try {
      const data = await api.get('/data/datasets');
      setDatasets(data || []);
    } catch (error) {
      setDatasets([]);
    }
  };

  const handleSubmit = async () => {
    if (!sheetUrl.trim()) return;
    
    setLoading(true);
    setUploadState({ status: "loading", message: "" });

    try {
      // Hit the webhook
      const webhookUrl = process.env.NEXT_PUBLIC_SHEET_HOOK;
      let data = null;
      if (webhookUrl) {
        try {
          const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sheet_url: sheetUrl.trim() })
          });
          if (response.ok) {
            data = await response.json();
          }
        } catch (e) {
          console.error("Webhook failed:", e);
        }
      }

      const normalizedData = extractWebhookPayload(data);

      setUploadState({
        status: "success",
        message: "Spreadsheet analyzed successfully. Updating Dashboard...",
        webhookData: normalizedData,
      });

      // Navigate to the dashboard to view the output charts and KPIs
      router.push('/dashboard');
    } catch (error: any) {
      setUploadState({
        status: "error",
        message: error.message || "Failed to ingest data from the spreadsheet.",
      });
    } finally {
      setLoading(false);
    }
  };

  const isValidUrl = (url: string) => {
    return url.includes("docs.google.com/spreadsheets") || url.includes("sheets.google.com") || url.startsWith("http");
  };

  return (
    <ProtectedRoute>
      <div className="p-6 lg:p-8 animate-fade-in pb-20 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Database className="text-blue-500" />
            Data Management
          </h1>
          <p className="text-muted-foreground mt-1">Connect your Google Spreadsheet to power AI analytics and insights.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - URL Input */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass p-6 rounded-xl border border-border/50">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Link2 size={20} className="text-primary" />
                Connect Spreadsheet
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-muted-foreground">
                    Google Spreadsheet URL
                  </label>
                  <input
                    type="url"
                    value={sheetUrl}
                    onChange={(e) => {
                      setUploadState({ sheetUrl: e.target.value, status: "idle" });
                    }}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    disabled={loading}
                    className={cn(
                      "w-full px-4 py-3 bg-secondary border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm",
                      status === "error" ? "border-destructive" : "border-border/50"
                    )}
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={loading || !sheetUrl.trim() || !isValidUrl(sheetUrl)}
                  className={cn(
                    "w-full py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2",
                    loading
                      ? "bg-primary/70 text-primary-foreground cursor-wait"
                      : "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25",
                    (!sheetUrl.trim() || !isValidUrl(sheetUrl)) && !loading && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Processing Spreadsheet...
                    </>
                  ) : (
                    <>
                      <ExternalLink size={18} />
                      Fetch & Analyze Data
                    </>
                  )}
                </button>
              </div>

              {/* Status Messages */}
              {status === "success" && (
                <div className="mt-4 flex items-start gap-2 text-green-500 text-sm bg-green-500/10 p-3 rounded-lg border border-green-500/20 animate-fade-in">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                  <span>{message}</span>
                </div>
              )}
              {status === "error" && (
                <div className="mt-4 flex items-start gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg border border-destructive/20 animate-fade-in">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{message}</span>
                </div>
              )}
            </div>

            <div className="glass p-5 rounded-xl border border-border/50 bg-secondary/20">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-500" /> How It Works
              </h3>
              <ul className="text-xs space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">1</div>
                  Paste your Google Spreadsheet URL above
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">2</div>
                  Our AI backend fetches and processes the data
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">3</div>
                  Dashboard, insights, and chatbot update automatically
                </li>
              </ul>
            </div>
          </div>

          {/* Right Column - Datasets */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-4">Recent Datasets</h2>
              {datasets.length > 0 ? (
                <div className="space-y-3">
                  {datasets.map(ds => (
                    <div key={ds.id} className="glass p-4 rounded-xl border border-border/50 flex items-center justify-between hover:border-primary/30 transition-colors">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                          <TableIcon size={20} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-foreground truncate text-sm" title={ds.filename}>{ds.filename}</h3>
                          <span className="text-xs text-muted-foreground">
                            {new Date(ds.uploaded_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-md bg-secondary border border-border/50 font-medium shrink-0">
                        {ds.type}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="glass rounded-xl p-8 text-center text-muted-foreground border-dashed border border-border/50">
                  <Database className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No datasets available. Connect a spreadsheet to get started.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
