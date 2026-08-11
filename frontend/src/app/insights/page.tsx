"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { InsightCard } from "@/components/InsightCard";
import { Lightbulb, RefreshCw, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

const categories = ["All", "Production", "Quality", "Energy", "Maintenance", "Scheduling"];

export default function InsightsPage() {
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<any[]>([]);

  useEffect(() => {
    void loadInsights();
  }, []);

  const loadInsights = async () => {
    setLoading(true);
    try {
      const data = await api.get('/insights');
      const mapped = (data || []).map((item: any) => ({
        id: String(item.id),
        category: item.category?.charAt(0).toUpperCase() + item.category?.slice(1) || 'Production',
        priority: item.priority?.charAt(0).toUpperCase() + item.priority?.slice(1) || 'Medium',
        title: item.title,
        description: item.description,
        action_items: item.action_items || [],
        data_evidence: item.data_evidence ? JSON.stringify(item.data_evidence) : undefined,
        created_at: item.created_at,
      }));
      setInsights(mapped);
    } catch (error) {
      setInsights([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredInsights = filter === "All" 
    ? insights 
    : insights.filter(i => i.category === filter);

  const handleRefresh = async () => {
    try {
      await api.post('/insights/generate', {});
      await loadInsights();
    } catch (error) {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="p-6 lg:p-8 animate-fade-in pb-20 max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Lightbulb className="text-amber-500" />
              AI Insights
            </h1>
            <p className="text-muted-foreground mt-1">Deep-learning generated operational intelligence and recommendations.</p>
          </div>
          <button 
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-70"
          >
            <RefreshCw size={18} className={cn(loading && "animate-spin")} />
            {loading ? "Analyzing..." : "Generate New Insights"}
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 overflow-x-auto pb-4 mb-4 scrollbar-hide">
          <Filter size={18} className="text-muted-foreground shrink-0" />
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border",
                filter === c 
                  ? "bg-primary text-primary-foreground border-primary" 
                  : "bg-secondary text-muted-foreground border-border/50 hover:bg-secondary/80"
              )}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Insights Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-64 rounded-xl bg-secondary/20 animate-pulse" />
            ))}
          </div>
        ) : filteredInsights.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-secondary/10 rounded-xl border border-border">
            <Lightbulb className="w-16 h-16 text-muted-foreground opacity-50 mb-4" />
            <h3 className="text-2xl font-bold mb-2">No Insights Available</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              We need manufacturing data to generate AI insights. Please upload production data or click "Generate New Insights" if data is already uploaded.
            </p>
            <button 
              onClick={handleRefresh}
              className="px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Generate Insights
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredInsights.map(insight => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
