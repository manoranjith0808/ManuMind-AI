"use client";

import { useRef, useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ChatMessage, MessageProps } from "@/components/ChatMessage";
import { Send, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppState } from "@/components/AppStateProvider";

/** Pull the reply text out of whatever shape the webhook returns.
 *  Actual format: { success, result: { answer: "..." }, status }
 *  Also handles flat: { "answer": "..." } and n8n envelope.
 */
function extractReply(data: any): string {
  // Unwrap n8n envelope if present, otherwise use data as-is
  const inner =
    data?.items?.[0]?.json ??
    (Array.isArray(data) ? (data[0]?.json ?? data[0]) : null) ??
    data;

  return (
    // Nested inside result object (actual webhook shape)
    inner?.result?.answer ??
    inner?.result?.reply ??
    inner?.result?.output ??
    inner?.result?.text ??
    inner?.result?.message ??
    inner?.result?.content ??
    (typeof inner?.result === "string" ? inner.result : null) ??
    // Flat top-level keys
    inner?.answer ??
    inner?.reply ??
    inner?.output ??
    inner?.text ??
    inner?.message ??
    inner?.content ??
    (typeof inner === "string" ? inner : null) ??
    "Received a response but could not read it. Please try again."
  );
}

export default function ChatPage() {
  const { state, setChatState } = useAppState();
  const messages = state.chat.messages as MessageProps[];
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (text: string) => {
    const question = text.trim();
    if (!question || isLoading) return;

    const userMsg: MessageProps = {
      role: "user",
      content: question,
      timestamp: new Date().toISOString(),
    };

    // 1. Show user message & update global state
    const newMessages = [...messages, userMsg];
    setChatState({ messages: newMessages });
    setInput("");
    setIsLoading(true);

    try {
      // 2. POST to webhook
      const webhookUrl = process.env.NEXT_PUBLIC_CHATBOT_HOOK;
      if (!webhookUrl) throw new Error("NEXT_PUBLIC_CHATBOT_HOOK is not set.");

      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question }),
      });

      if (!res.ok) throw new Error(`Webhook error: ${res.status} ${res.statusText}`);

      // 3. Display reply & update global state
      const data = await res.json();
      const aiReplyText = extractReply(data);
      const aiMsg: MessageProps = {
        role: "assistant",
        content: aiReplyText,
        timestamp: new Date().toISOString(),
      };

      setChatState({ messages: [...newMessages, aiMsg] });
    } catch (err: any) {
      const errorMsg: MessageProps = {
        role: "assistant",
        content: `⚠️ ${err.message ?? "Something went wrong. Please try again."}`,
        timestamp: new Date().toISOString(),
      };
      setChatState({ messages: [...newMessages, errorMsg] });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex h-full flex-col max-w-5xl mx-auto border-x border-border/50 bg-background/50 relative">

        {/* Header */}
        <div className="p-4 border-b border-border/50 glass-panel shrink-0 flex items-center gap-3 z-10 sticky top-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <Sparkles size={20} />
          </div>
          <div>
            <h2 className="font-semibold">ManuMind Assistant</h2>
            <p className="text-xs text-green-500 flex items-center gap-1 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Online
            </p>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 sm:p-6 pb-36 scroll-smooth"
        >
          {messages.map((msg, idx) => (
            <ChatMessage key={idx} {...msg} />
          ))}

          {/* Typing indicator while waiting for webhook */}
          {isLoading && (
            <div className="flex w-full mb-6 justify-start">
              <div className="flex max-w-[80%] gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg flex items-center justify-center shrink-0 mt-1">
                  <Sparkles size={16} />
                </div>
                <div className="glass-panel px-5 py-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 w-full glass-panel border-t border-border/50 p-4 shrink-0">
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
            className="flex items-center gap-2 relative"
          >
            <input
              id="chat-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about your manufacturing data..."
              disabled={isLoading}
              className="flex-1 px-4 py-3.5 pr-14 rounded-xl border border-border/50 bg-background focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-shadow shadow-sm disabled:opacity-60"
            />
            <button
              id="chat-send-btn"
              type="submit"
              disabled={isLoading || !input.trim()}
              className="absolute right-2 p-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Send size={17} className={cn(isLoading && "opacity-0")} />
              {isLoading && (
                <Loader2
                  size={17}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin"
                />
              )}
            </button>
          </form>

          <p className="text-center mt-2 text-[10px] text-muted-foreground">
            AI can make mistakes. Verify critical production parameters before action.
          </p>
        </div>
      </div>
    </ProtectedRoute>
  );
}
