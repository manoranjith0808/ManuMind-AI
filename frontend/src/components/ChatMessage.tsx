import ReactMarkdown from "react-markdown";
import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MessageProps {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export function ChatMessage({ role, content, timestamp }: MessageProps) {
  const isUser = role === "user";

  return (
    <div className={cn("flex w-full mb-6", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("flex max-w-[80%] gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
        
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1",
          isUser ? "bg-blue-600 text-white" : "bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg"
        )}>
          {isUser ? <User size={16} /> : <Bot size={16} />}
        </div>

        <div className="flex flex-col gap-1 min-w-0">
          <div className={cn(
            "px-4 py-3 rounded-2xl",
            isUser 
              ? "bg-primary text-primary-foreground rounded-tr-none shadow-md" 
              : "glass-panel rounded-tl-none shadow-sm text-foreground prose prose-sm dark:prose-invert max-w-none"
          )}>
            {isUser ? (
              <p className="whitespace-pre-wrap text-sm">{content}</p>
            ) : (
              <ReactMarkdown>{content}</ReactMarkdown>
            )}
          </div>
          <span className={cn(
            "text-xs text-muted-foreground px-1",
            isUser ? "text-right" : "text-left"
          )}>
            {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
}
