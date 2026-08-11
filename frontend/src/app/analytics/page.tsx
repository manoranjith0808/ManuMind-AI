"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from "recharts";
import { BarChart3, Calendar } from "lucide-react";

const productionData = [
  { date: "Oct 1", ProductA: 400, ProductB: 240, ProductC: 240 },
  { date: "Oct 2", ProductA: 300, ProductB: 139, ProductC: 221 },
  { date: "Oct 3", ProductA: 200, ProductB: 980, ProductC: 229 },
  { date: "Oct 4", ProductA: 278, ProductB: 390, ProductC: 200 },
  { date: "Oct 5", ProductA: 189, ProductB: 480, ProductC: 218 },
  { date: "Oct 6", ProductA: 239, ProductB: 380, ProductC: 250 },
  { date: "Oct 7", ProductA: 349, ProductB: 430, ProductC: 210 },
];

const machineOeeData = [
  { subject: 'Availability', M101: 95, M102: 80, M104: 90 },
  { subject: 'Performance', M101: 85, M102: 90, M104: 75 },
  { subject: 'Quality', M101: 99, M102: 85, M104: 95 },
  { subject: 'Health', M101: 90, M102: 70, M104: 85 },
  { subject: 'Energy Eff.', M101: 85, M102: 60, M104: 92 },
];

export default function AnalyticsPage() {
  const [range, setRange] = useState("7d");

  return (
    <ProtectedRoute>
      <div className="p-6 lg:p-8 animate-fade-in pb-20">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <BarChart3 className="text-purple-500" />
              Deep Analytics
            </h1>
            <p className="text-muted-foreground mt-1">Multi-dimensional operational analysis</p>
          </div>
          <div className="flex items-center gap-3 bg-secondary/50 p-1 rounded-lg border border-border/50">
            {["7d", "14d", "30d", "YTD"].map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  range === r ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r}
              </button>
            ))}
            <button className="px-3 py-1.5 text-muted-foreground hover:text-foreground border-l border-border/50 ml-1 flex items-center">
              <Calendar size={16} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Stacked Area - Production Volume */}
          <div className="glass p-5 rounded-xl border border-border/50 lg:col-span-2">
            <h3 className="text-lg font-semibold mb-6">Production Volume Composition</h3>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={productionData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorA" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorB" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorC" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--foreground)' }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="ProductA" stackId="1" stroke="#3b82f6" fillOpacity={1} fill="url(#colorA)" />
                  <Area type="monotone" dataKey="ProductB" stackId="1" stroke="#10b981" fillOpacity={1} fill="url(#colorB)" />
                  <Area type="monotone" dataKey="ProductC" stackId="1" stroke="#f59e0b" fillOpacity={1} fill="url(#colorC)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Radar Chart - Machine Comparison */}
          <div className="glass p-5 rounded-xl border border-border/50">
            <h3 className="text-lg font-semibold mb-6">Machine OEE Radar Analysis</h3>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={machineOeeData}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} />
                  <Radar name="M101 (Milling)" dataKey="M101" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  <Radar name="M102 (Lathe)" dataKey="M102" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
                  <Radar name="M104 (Mold)" dataKey="M104" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Statistical Summary Box */}
          <div className="glass p-5 rounded-xl border border-border/50 flex flex-col justify-center">
            <h3 className="text-lg font-semibold mb-6">Statistical Insights</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 border-b border-border/50">
                <span className="text-muted-foreground">Standard Deviation (Production)</span>
                <span className="font-mono font-medium">±14.2 units</span>
              </div>
              <div className="flex justify-between items-center p-3 border-b border-border/50">
                <span className="text-muted-foreground">Highest Variance Machine</span>
                <span className="font-mono font-medium text-amber-500">M102 (Lathe)</span>
              </div>
              <div className="flex justify-between items-center p-3 border-b border-border/50">
                <span className="text-muted-foreground">OEE Trend (30d)</span>
                <span className="font-mono font-medium text-green-500">+1.2% slope</span>
              </div>
              <div className="flex justify-between items-center p-3">
                <span className="text-muted-foreground">Energy to Production Correlation</span>
                <span className="font-mono font-medium">R² = 0.89</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
