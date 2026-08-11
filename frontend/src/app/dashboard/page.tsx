"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useDashboard } from "@/hooks/useDashboard";
import { KPICard } from "@/components/KPICard";
import { MachineStatusTable } from "@/components/MachineStatusTable";
import { 
  Activity, Zap, Clock, PackageCheck, AlertTriangle, Users, Loader2, ShieldAlert, Link2
} from "lucide-react";
import Link from "next/link";
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from "recharts";

export default function DashboardPage() {
  const { data, isLoading, error } = useDashboard();

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="h-full flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !data) {
    return (
      <ProtectedRoute>
        <div className="h-full flex flex-col items-center justify-center text-destructive">
          <AlertTriangle className="w-12 h-12 mb-4 opacity-50" />
          <h2 className="text-xl font-semibold">Failed to load dashboard</h2>
          <p className="text-sm mt-2 opacity-70">{error}</p>
        </div>
      </ProtectedRoute>
    );
  }

  const { kpis, productionTrend, machineUtilization, defectAnalysis, shiftPerformance, machines } = data;

  const PIE_COLORS = ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

  if (kpis.totalMachines === 0) {
    return (
      <ProtectedRoute>
        <div className="h-full flex flex-col items-center justify-center p-8 animate-fade-in text-center">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <Link2 className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Welcome to ManuMind AI</h1>
          <p className="text-muted-foreground max-w-md mb-8 text-lg">
            Your dashboard is currently empty. Connect your Google Spreadsheet to begin AI-powered manufacturing analysis.
          </p>
          <Link 
            href="/upload" 
            className="px-8 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-lg hover:shadow-primary/25"
          >
            Connect Spreadsheet
          </Link>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="p-6 lg:p-8 space-y-8 animate-fade-in pb-20">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard Overview</h1>
            <p className="text-muted-foreground mt-1">Real-time manufacturing intelligence and KPIs</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-green-500/10 text-green-500 border border-green-500/20 rounded-lg text-sm font-medium flex items-center">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2" />
              Live Updates
            </div>
          </div>
        </div>

        {/* KPIs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <KPICard 
            title="OEE" 
            value={`${kpis.oee}%`} 
            subtitle="Overall Equip. Effectiveness"
            icon={Activity} 
            trend="up" 
            trendValue="+2.4%" 
            color="blue"
          />
          <KPICard 
            title="Production Progress" 
            value={`${kpis.productionProgress}%`} 
            subtitle="Target vs Actual"
            icon={PackageCheck} 
            trend="up" 
            trendValue="+1.1%" 
            color="green"
          />
          <KPICard 
            title="Active Machines" 
            value={`${kpis.activeMachines}/${kpis.totalMachines}`} 
            subtitle="Currently running"
            icon={Zap} 
            trend="neutral" 
            trendValue="0" 
            color="cyan"
          />
          <KPICard 
            title="Downtime" 
            value={`${kpis.downtime}h`} 
            subtitle="Today's total"
            icon={Clock} 
            trend="down" 
            trendValue="-0.5h" 
            color="red"
          />
          <KPICard 
            title="Energy Consumed" 
            value={`${kpis.energyConsumption}`} 
            subtitle="kWh today"
            icon={Zap} 
            trend="up" 
            trendValue="+5%" 
            color="amber"
          />
          <KPICard 
            title="Quality Rate" 
            value={`${kpis.qualityRate}%`} 
            subtitle={`${kpis.defects} defects reported`}
            icon={ShieldAlert} 
            trend="up" 
            trendValue="+0.8%" 
            color="purple"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Production Trend */}
          <div className="glass p-5 rounded-xl border border-border/50">
            <h3 className="text-lg font-semibold mb-6">Production Trend (7 Days)</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={productionTrend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--foreground)' }}
                    itemStyle={{ color: 'var(--foreground)' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                  <Line type="monotone" dataKey="actual" name="Actual Units" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="target" name="Target" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Machine Utilization */}
          <div className="glass p-5 rounded-xl border border-border/50">
            <h3 className="text-lg font-semibold mb-6">Machine Utilization</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={machineUtilization} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--foreground)' }}
                    cursor={{ fill: 'var(--muted)', opacity: 0.2 }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                  <Bar dataKey="util" name="Utilization %" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Defect Analysis */}
          <div className="glass p-5 rounded-xl border border-border/50">
            <h3 className="text-lg font-semibold mb-6">Defect Analysis</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={defectAnalysis}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="value"
                    label={(props: any) => `${props.name || ''} ${((props.percent || 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {defectAnalysis.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--foreground)' }}
                    itemStyle={{ color: 'var(--foreground)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Shift Performance */}
          <div className="glass p-5 rounded-xl border border-border/50">
            <h3 className="text-lg font-semibold mb-6">Shift Performance (Units)</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={shiftPerformance} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="shift" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--foreground)' }}
                    cursor={{ fill: 'var(--muted)', opacity: 0.2 }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                  <Bar dataKey="ProductA" name="Product A" fill="#3b82f6" radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar dataKey="ProductB" name="Product B" fill="#10b981" radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar dataKey="ProductC" name="Product C" fill="#f59e0b" radius={[4, 4, 0, 0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Machine Status Table */}
        <div className="glass rounded-xl border border-border/50 overflow-hidden">
          <div className="p-5 border-b border-border/50 flex justify-between items-center">
            <h3 className="text-lg font-semibold">Live Machine Status</h3>
            <button className="text-sm text-primary hover:underline font-medium">View All</button>
          </div>
          <MachineStatusTable machines={machines} />
        </div>
      </div>
    </ProtectedRoute>
  );
}

function ShieldAlertIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
