"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { GanttChart } from "@/components/GanttChart";
import { AlertOctagon, RefreshCcw, Loader2, ArrowRight, TrendingDown } from "lucide-react";

export default function ReschedulingPage() {
  const [loading, setLoading] = useState(false);
  const [simulated, setSimulated] = useState(false);
  const [machine, setMachine] = useState("M104");

  const handleSimulate = () => {
    setLoading(true);
    setTimeout(() => {
      setSimulated(true);
      setLoading(false);
    }, 2500);
  };

  const now = new Date();
  
  // Original Plan (simplified for demo)
  const originalTasks = [
    { id: "o1", name: "Job A", start: now, end: new Date(now.getTime() + 4 * 3600000), progress: 40, type: "task" as const, project: "M101" },
    { id: "o2", name: "Job B", start: now, end: new Date(now.getTime() + 6 * 3600000), progress: 20, type: "task" as const, project: "M104" },
    { id: "o3", name: "Job C", start: new Date(now.getTime() + 6.5 * 3600000), end: new Date(now.getTime() + 10 * 3600000), progress: 0, type: "task" as const, project: "M104" },
  ];

  // Rescheduled Plan (M104 failed)
  const rescheduledTasks = [
    { id: "r1", name: "Job A", start: now, end: new Date(now.getTime() + 4 * 3600000), progress: 40, type: "task" as const, project: "M101" },
    { id: "rx", name: "FAILURE M104", start: now, end: new Date(now.getTime() + 8 * 3600000), progress: 0, type: "task" as const, project: "M104", styles: { progressColor: "#ef4444", backgroundColor: "#ef4444", backgroundSelectedColor: "#ef4444" } },
    { id: "r2", name: "Job B (Migrated)", start: new Date(now.getTime() + 4.5 * 3600000), end: new Date(now.getTime() + 9 * 3600000), progress: 20, type: "task" as const, project: "M101", styles: { progressColor: "#f59e0b" } },
    { id: "r3", name: "Job C (Migrated)", start: now, end: new Date(now.getTime() + 4.5 * 3600000), progress: 0, type: "task" as const, project: "M106", styles: { progressColor: "#f59e0b" } },
  ];

  return (
    <ProtectedRoute>
      <div className="p-6 lg:p-8 animate-fade-in pb-20 max-w-7xl mx-auto">
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Dynamic Rescheduling</h1>
          <p className="text-muted-foreground mt-1">Simulate failures and let AI automatically reroute production to minimize impact.</p>
        </div>

        {/* Simulator Controls */}
        <div className="glass p-6 rounded-xl border border-border/50 mb-8 border-l-4 border-l-red-500 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 bg-red-500/5 rounded-bl-full pointer-events-none" />
          
          <div className="flex flex-col md:flex-row gap-6 items-end relative z-10">
            <div className="flex-1 space-y-2 w-full">
              <label className="text-sm font-medium text-foreground">Select Machine Failure</label>
              <select 
                value={machine}
                onChange={(e) => setMachine(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border bg-secondary/80 focus:bg-background outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="M101">M101 - CNC Milling A</option>
                <option value="M102">M102 - CNC Lathe B</option>
                <option value="M104">M104 - Injection Mold</option>
                <option value="M106">M106 - CNC Milling C</option>
              </select>
            </div>
            
            <div className="flex-1 space-y-2 w-full">
              <label className="text-sm font-medium text-foreground">Time of Failure</label>
              <input 
                type="time" 
                defaultValue="10:30"
                className="w-full px-4 py-2.5 rounded-lg border bg-secondary/80 focus:bg-background outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex-1 space-y-2 w-full">
              <label className="text-sm font-medium text-foreground">Target Plan</label>
              <select className="w-full px-4 py-2.5 rounded-lg border bg-secondary/80 focus:bg-background outline-none focus:ring-2 focus:ring-red-500">
                <option>Today's Morning Shift Plan</option>
                <option>Week 42 Master Schedule</option>
              </select>
            </div>

            <button 
              onClick={handleSimulate}
              disabled={loading}
              className="w-full md:w-auto px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-all flex items-center justify-center shrink-0 disabled:opacity-70 shadow-lg shadow-red-500/20"
            >
              {loading ? (
                <><Loader2 className="animate-spin w-5 h-5 mr-2" /> Recalculating...</>
              ) : (
                <><AlertOctagon className="w-5 h-5 mr-2" /> Simulate Failure</>
              )}
            </button>
          </div>
        </div>

        {/* Results Area */}
        {simulated && !loading && (
          <div className="space-y-8 animate-slide-up">
            
            {/* Impact Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="glass p-5 rounded-xl border border-red-500/20 bg-red-500/5">
                <div className="flex items-center gap-2 text-red-500 mb-2">
                  <TrendingDown size={18} />
                  <span className="text-sm font-semibold uppercase tracking-wider">Delay Impact</span>
                </div>
                <p className="text-2xl font-bold">+2.5 <span className="text-sm font-normal text-muted-foreground">hours</span></p>
              </div>
              
              <div className="glass p-5 rounded-xl border border-amber-500/20 bg-amber-500/5">
                <div className="flex items-center gap-2 text-amber-500 mb-2">
                  <RefreshCcw size={18} />
                  <span className="text-sm font-semibold uppercase tracking-wider">Tasks Moved</span>
                </div>
                <p className="text-2xl font-bold">2</p>
              </div>
              
              <div className="glass p-5 rounded-xl border border-blue-500/20 bg-blue-500/5">
                <div className="flex items-center gap-2 text-blue-500 mb-2">
                  <AlertOctagon size={18} />
                  <span className="text-sm font-semibold uppercase tracking-wider">Affected Products</span>
                </div>
                <p className="text-2xl font-bold">Job B, Job C</p>
              </div>

              <div className="glass p-5 rounded-xl border border-green-500/20 bg-green-500/5">
                <div className="flex items-center gap-2 text-green-500 mb-2">
                  <ArrowRight size={18} />
                  <span className="text-sm font-semibold uppercase tracking-wider">New Completion</span>
                </div>
                <p className="text-2xl font-bold">20:30 <span className="text-sm font-normal text-muted-foreground">Today</span></p>
              </div>
            </div>

            {/* Comparison Gantt */}
            <div className="grid grid-cols-1 gap-6">
              <div className="glass p-5 rounded-xl border border-border/50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-muted-foreground">Original Schedule</h3>
                  <span className="px-2 py-1 bg-secondary rounded text-xs font-medium">Before Failure</span>
                </div>
                <GanttChart tasks={originalTasks} />
              </div>

              <div className="glass p-5 rounded-xl border border-primary/30 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-bl-full pointer-events-none" />
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <RefreshCcw className="text-primary w-5 h-5" /> AI Rescheduled Plan
                  </h3>
                  <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-xs font-bold uppercase tracking-wider">Optimized</span>
                </div>
                <GanttChart tasks={rescheduledTasks} />
              </div>
            </div>

            {/* Log / Reasoning */}
            <div className="glass p-6 rounded-xl border border-border/50">
              <h3 className="text-lg font-semibold mb-4">Rescheduling Action Log</h3>
              <div className="space-y-4">
                <div className="flex gap-4 p-3 rounded-lg hover:bg-secondary/50 transition-colors border border-transparent hover:border-border/50">
                  <div className="text-red-500 shrink-0 mt-0.5"><AlertOctagon size={18} /></div>
                  <div>
                    <p className="text-sm font-medium">Machine {machine} reported failure</p>
                    <p className="text-xs text-muted-foreground">Estimated downtime: 8 hours. Aborting active Job B.</p>
                  </div>
                </div>
                <div className="flex gap-4 p-3 rounded-lg hover:bg-secondary/50 transition-colors border border-transparent hover:border-border/50">
                  <div className="text-amber-500 shrink-0 mt-0.5"><RefreshCcw size={18} /></div>
                  <div>
                    <p className="text-sm font-medium">Migrated Job B to M101</p>
                    <p className="text-xs text-muted-foreground">M101 has compatible tooling. Queued after Job A completes at 14:30.</p>
                  </div>
                </div>
                <div className="flex gap-4 p-3 rounded-lg hover:bg-secondary/50 transition-colors border border-transparent hover:border-border/50">
                  <div className="text-green-500 shrink-0 mt-0.5"><ArrowRight size={18} /></div>
                  <div>
                    <p className="text-sm font-medium">Migrated Job C to M106</p>
                    <p className="text-xs text-muted-foreground">M106 had idle capacity. Started Job C immediately to offset delay.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
