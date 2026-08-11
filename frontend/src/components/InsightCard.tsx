"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, AlertCircle, TrendingUp, Zap, Clock, ShieldAlert } from "lucide-react";
import { cn, getPriorityColor } from "@/lib/utils";

interface Insight {
  id: string;
  category: "Production" | "Quality" | "Energy" | "Maintenance" | "Scheduling";
  priority: "High" | "Medium" | "Low";
  title: string;
  description: string;
  action_items: string[];
  data_evidence?: string;
  created_at: string;
}

export function InsightCard({ insight }: { insight: Insight }) {
  const [expanded, setExpanded] = useState(false);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Production": return TrendingUp;
      case "Quality": return ShieldAlert;
      case "Energy": return Zap;
      case "Maintenance": return AlertCircle;
      case "Scheduling": return Clock;
      default: return AlertCircle;
    }
  };

  const Icon = getCategoryIcon(insight.category);

  return (
    <div className="glass rounded-xl overflow-hidden transition-all duration-300 animate-fade-in hover:shadow-lg">
      <div 
        className="p-5 cursor-pointer flex items-start gap-4"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="p-3 rounded-full bg-primary/10 text-primary shrink-0">
          <Icon size={24} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={cn(
              "px-2.5 py-0.5 rounded-full text-xs font-semibold border",
              getPriorityColor(insight.priority)
            )}>
              {insight.priority} Priority
            </span>
            <span className="text-xs text-muted-foreground font-medium px-2 py-0.5 bg-secondary rounded-full">
              {insight.category}
            </span>
            <span className="text-xs text-muted-foreground ml-auto">
              {new Date(insight.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          
          <h3 className="text-lg font-semibold mt-2">{insight.title}</h3>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {insight.description}
          </p>
        </div>
        
        <button className="text-muted-foreground hover:text-foreground shrink-0 mt-2">
          {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {expanded && (
        <div className="px-5 pb-5 pt-2 border-t border-border/50 animate-slide-up">
          <p className="text-sm text-foreground mb-4">{insight.description}</p>
          
          {insight.data_evidence && (
            <div className="bg-secondary/50 p-3 rounded-lg border border-border/50 mb-4">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Data Evidence
              </span>
              <p className="text-sm font-mono text-foreground/90">{insight.data_evidence}</p>
            </div>
          )}

          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
              Recommended Actions
            </span>
            <ul className="space-y-2">
              {insight.action_items.map((item, idx) => (
                <li key={idx} className="flex items-start text-sm">
                  <span className="text-primary mr-2">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
