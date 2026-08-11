"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import {
  Loader2, CalendarClock, Settings2, CheckCircle2, Activity,
  AlertCircle, Cpu, Clock, Target, Zap, ChevronDown, ChevronUp,
  Lightbulb, TrendingUp, Timer, XCircle, PackageX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";

import { useAppState } from "@/components/AppStateProvider";

/* ─── constants ────────────────────────────────────────────────────────────── */

const MACHINE_COLORS: Record<string, string> = {
  M101: "#3b82f6",
  M102: "#10b981",
  M103: "#f59e0b",
  M104: "#ef4444",
  M105: "#8b5cf6",
  M106: "#ec4899",
};
const DEFAULT_COLOR = "#6b7280";
const ALL_MACHINES = ["M101", "M102", "M103", "M104", "M105", "M106"];

type Shift = "morning" | "afternoon" | "night";
const SHIFTS: { key: Shift; label: string; time: string }[] = [
  { key: "morning",   label: "Morning",   time: "06:00 – 14:00" },
  { key: "afternoon", label: "Afternoon", time: "14:00 – 22:00" },
  { key: "night",     label: "Night",     time: "22:00 – 06:00" },
];

/* ─── helpers ───────────────────────────────────────────────────────────────── */

/** Unwrap n8n / webhook envelope → inner payload */
function unwrap(data: any): any {
  if (Array.isArray(data) && data[0]?.json) return data[0].json;
  if (data?.items?.[0]?.json) return data.items[0].json;
  return data;
}

function fmtDateTime(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function isoToMs(iso: string): number {
  return new Date(iso).getTime();
}

/* ─── component ─────────────────────────────────────────────────────────────── */

export default function SchedulingPage() {
  const { state, setSchedulingState } = useAppState();
  const { result, rawResponse, formData } = state.scheduling;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  const setFormData = (newForm: any) => {
    setSchedulingState({ formData: newForm });
  };

  const toggleMachine = (m: string) => {
    const curr = formData.available_machines;
    setFormData({
      ...formData,
      available_machines: curr.includes(m) ? curr.filter((x) => x !== m) : [...curr, m],
    });
  };

  const toggleShift = (key: Shift) => {
    setFormData({
      ...formData,
      active_shifts: { ...formData.active_shifts, [key]: !formData.active_shifts[key] },
    });
  };

  /* ── fetch ── */
  const generateSchedule = async () => {
    setLoading(true);
    setError(null);

    const payload = {
      production_target: formData.production_target,
      product_type: formData.product_type,
      start_time: formData.start_time || null,
      delivery_deadline: formData.delivery_deadline || null,
      available_machines: formData.available_machines,
      active_shifts: Object.entries(formData.active_shifts)
        .filter(([, v]) => v)
        .map(([k]) => k),
    };

    try {
      const webhookUrl = process.env.NEXT_PUBLIC_SCHEDULER_HOOK;
      if (!webhookUrl) throw new Error("Scheduler webhook URL not configured.");

      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`Webhook returned status ${res.status}`);

      const data = await res.json();
      setSchedulingState({
        rawResponse: JSON.stringify(data, null, 2),
        result: unwrap(data),
      });
    } catch (e: any) {
      setError(e.message || "Failed to reach the scheduler webhook.");
    } finally {
      setLoading(false);
    }
  };

  /* ── derived data ── */
  const schedule:  any[]    = result?.schedule  ?? [];
  const summary:   any      = result?.summary   ?? {};
  const insights:  string[] = Array.isArray(result?.insights) ? result.insights : [];

  const isInsufficient = summary.capacityStatus === "Insufficient";

  /** Gantt: normalise ISO datetimes → hours from first-task-start */
  const ganttData = (() => {
    if (!schedule.length) return [];
    const baseline = Math.min(...schedule.map((t) => isoToMs(t.startTime)));
    return schedule.map((t) => {
      const startH = (isoToMs(t.startTime) - baseline) / 3_600_000;
      const durH   = (isoToMs(t.endTime)   - isoToMs(t.startTime)) / 3_600_000;
      return {
        label:          `${t.machine} · ${t.shift}`,
        machine:        t.machine,
        shift:          t.shift,
        start:          parseFloat(startH.toFixed(2)),
        duration:       parseFloat(durH.toFixed(2)),
        allocatedUnits: t.allocatedUnits,
        unitsPerHour:   t.unitsPerHour,
        startTime:      t.startTime,
        endTime:        t.endTime,
      };
    });
  })();

  /** Per-machine unit-allocation bar data */
  const allocData = schedule.map((t) => ({
    machine: t.machine,
    units:   t.allocatedUnits,
    hours:   t.estimatedHours,
  }));

  /* ── summary cards ── */
  const summaryCards = [
    {
      label: "Production Target",
      value: summary.productionTarget != null ? summary.productionTarget.toLocaleString() : "—",
      unit: "units",
      icon: <Target size={18} />,
      color: isInsufficient ? "border-l-red-500" : "border-l-blue-500",
      glow:  isInsufficient ? "from-red-500/10"  : "from-blue-500/10",
    },
    {
      label: "Schedule Start",
      value: fmtDateTime(summary.scheduleStartTime),
      icon: <CalendarClock size={18} />,
      color: "border-l-sky-500",
      glow: "from-sky-500/10",
    },
    {
      label: "Est. Completion",
      value: fmtDateTime(summary.estimatedCompletion),
      icon: <Clock size={18} />,
      color: isInsufficient ? "border-l-orange-500" : "border-l-emerald-500",
      glow:  isInsufficient ? "from-orange-500/10"  : "from-emerald-500/10",
    },
    {
      label: "Machines Used",
      value: summary.totalMachinesUsed ?? "—",
      icon: <Cpu size={18} />,
      color: "border-l-amber-500",
      glow: "from-amber-500/10",
    },
    {
      label: "Total Duration",
      value: summary.estimatedDurationHours != null ? `${summary.estimatedDurationHours}h` : "—",
      icon: <Timer size={18} />,
      color: "border-l-purple-500",
      glow: "from-purple-500/10",
    },
  ];

  /** Extra cards shown only when capacity is insufficient */
  const insufficientCards = isInsufficient ? [
    {
      label: "Max Achievable",
      value: summary.maximumPossibleProduction != null
        ? summary.maximumPossibleProduction.toLocaleString()
        : "—",
      unit: "units",
      icon: <PackageX size={18} />,
      color: "border-l-orange-500",
      glow: "from-orange-500/10",
    },
    {
      label: "Remaining Units",
      value: summary.remainingUnits != null ? summary.remainingUnits.toLocaleString() : "—",
      unit: "units",
      icon: <XCircle size={18} />,
      color: "border-l-red-500",
      glow: "from-red-500/10",
    },
  ] : [];

  const deadlineStatus: string | undefined = summary.deadlineStatus;
  const isDelayed = deadlineStatus === "Delayed" || isInsufficient;
  const deadlineStyle =
    deadlineStatus === "On Track"
      ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/30"
      : deadlineStatus === "At Risk"
      ? "text-amber-400 bg-amber-400/10 border-amber-400/30"
      : "text-red-400 bg-red-400/10 border-red-400/30";

  /* ── custom Gantt tooltip ── */
  const GanttTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div className="bg-background/95 border border-border/60 rounded-xl p-3 shadow-xl text-xs space-y-1 backdrop-blur-sm">
        <p className="font-bold text-foreground text-sm">{d.machine}</p>
        <p className="text-muted-foreground capitalize">{d.shift} shift</p>
        <p><span className="text-muted-foreground">Start: </span><span className="text-foreground">{fmtDateTime(d.startTime)}</span></p>
        <p><span className="text-muted-foreground">End: </span><span className="text-foreground">{fmtDateTime(d.endTime)}</span></p>
        <p><span className="text-muted-foreground">Duration: </span><span className="text-primary font-semibold">{d.duration}h</span></p>
        <p><span className="text-muted-foreground">Units: </span><span className="text-foreground font-semibold">{d.allocatedUnits?.toLocaleString()}</span></p>
      </div>
    );
  };

  /* ── render ── */
  return (
    <ProtectedRoute>
      <div className="p-6 lg:p-8 animate-fade-in pb-20">
        {/* header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <CalendarClock className="text-primary" />
            AI Production Scheduling
          </h1>
          <p className="text-muted-foreground mt-1">
            Generate optimized production plans using AI constraint satisfaction
          </p>
        </div>

        <div className="flex flex-col xl:flex-row gap-8">
          {/* ── Left: Config Panel ── */}
          <div className="w-full xl:w-[380px] shrink-0">
            <div className="glass p-6 rounded-xl border border-border/50 space-y-5">
              <div className="flex items-center gap-2 border-b border-border/50 pb-4">
                <Settings2 className="text-primary" size={20} />
                <h2 className="text-lg font-semibold">Configuration</h2>
              </div>

              {/* Production Target */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Target size={14} className="text-blue-400" /> Production Target (Units)
                </label>
                <input
                  type="number"
                  min={1}
                  value={formData.production_target}
                  onChange={(e) =>
                    setFormData({ ...formData, production_target: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-4 py-2.5 rounded-lg border border-border/50 bg-secondary/50 focus:bg-background outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm"
                />
              </div>

              {/* Product Type */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Product Type</label>
                <select
                  value={formData.product_type}
                  onChange={(e) => setFormData({ ...formData, product_type: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-border/50 bg-secondary/50 focus:bg-background outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm"
                >
                  {["Product A", "Product B", "Product C", "Product D"].map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Start Time */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Zap size={14} className="text-blue-400" /> Production Start Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-border/50 bg-secondary/50 focus:bg-background outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm"
                />
              </div>

              {/* Deadline */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Clock size={14} className="text-green-400" /> Delivery Deadline
                </label>
                <input
                  type="datetime-local"
                  value={formData.delivery_deadline}
                  onChange={(e) => setFormData({ ...formData, delivery_deadline: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-border/50 bg-secondary/50 focus:bg-background outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm"
                />
              </div>

              {/* Machines */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Cpu size={14} className="text-amber-400" /> Available Machines
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {ALL_MACHINES.map((m) => {
                    const selected = formData.available_machines.includes(m);
                    return (
                      <button
                        key={m}
                        onClick={() => toggleMachine(m)}
                        className={cn(
                          "py-2 rounded-lg border text-sm font-medium transition-all duration-200",
                          selected
                            ? "border-primary bg-primary/20 text-primary shadow-sm shadow-primary/20"
                            : "border-border/50 bg-secondary/30 text-muted-foreground hover:border-border hover:bg-secondary/60"
                        )}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Shifts */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Zap size={14} className="text-purple-400" /> Active Shifts
                </label>
                <div className="space-y-2">
                  {SHIFTS.map(({ key, label, time }) => {
                    const active = formData.active_shifts[key];
                    return (
                      <button
                        key={key}
                        onClick={() => toggleShift(key)}
                        className={cn(
                          "w-full flex items-center justify-between px-4 py-2.5 rounded-lg border text-sm transition-all duration-200",
                          active
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/50 bg-secondary/30 text-muted-foreground hover:bg-secondary/50"
                        )}
                      >
                        <span className="font-medium">{label}</span>
                        <span className="text-xs opacity-70">{time}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Generate */}
              <button
                id="generate-schedule-btn"
                onClick={generateSchedule}
                disabled={loading || formData.available_machines.length === 0}
                className={cn(
                  "w-full py-3 mt-2 rounded-lg font-semibold transition-all duration-200 flex justify-center items-center gap-2 shadow-lg",
                  loading
                    ? "bg-primary/70 text-primary-foreground cursor-wait shadow-primary/20"
                    : "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-primary/30 shadow-primary/20",
                  formData.available_machines.length === 0 && "opacity-50 cursor-not-allowed"
                )}
              >
                {loading ? (
                  <><Loader2 className="animate-spin" size={18} /> AI is optimizing...</>
                ) : (
                  <><CalendarClock size={18} /> Generate AI Schedule</>
                )}
              </button>
            </div>
          </div>

          {/* ── Right: Results Panel ── */}
          <div className="flex-1 min-w-0 flex flex-col gap-6">

            {/* Idle */}
            {!result && !loading && !error && (
              <div className="h-full min-h-[400px] border-2 border-dashed border-border/50 rounded-xl flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-secondary/10">
                <Settings2 className="w-12 h-12 mb-4 opacity-30" />
                <h3 className="text-lg font-medium text-foreground mb-1">Configure Parameters to Start</h3>
                <p className="max-w-md text-sm">
                  Set your constraints on the left and click{" "}
                  <strong className="text-foreground">Generate AI Schedule</strong>{" "}
                  to receive an optimized production plan.
                </p>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="h-full min-h-[400px] border border-border/50 rounded-xl flex flex-col items-center justify-center text-primary p-8 text-center glass">
                <Activity className="w-16 h-16 mb-4 animate-pulse" />
                <h3 className="text-xl font-semibold mb-2">Optimizing Production Variables...</h3>
                <p className="text-muted-foreground max-w-sm text-sm">
                  The AI is evaluating constraints, machine capacities, and shift windows.
                </p>
              </div>
            )}

            {/* Error */}
            {error && !loading && (
              <div className="flex items-start gap-3 p-5 rounded-xl border border-destructive/40 bg-destructive/10 text-destructive">
                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Webhook Error</p>
                  <p className="text-sm mt-0.5 opacity-80">{error}</p>
                </div>
              </div>
            )}

            {/* ── Results ── */}
            {result && !loading && (
              <div className="space-y-6 animate-slide-up">

                {/* Capacity Insufficient Alert */}
                {isInsufficient && (
                  <div className="flex items-start gap-4 px-5 py-4 rounded-xl border border-red-500/40 bg-red-500/10 text-red-300">
                    <XCircle size={20} className="shrink-0 mt-0.5 text-red-400" />
                    <div>
                      <p className="font-bold text-red-300 text-sm mb-0.5">Insufficient Capacity</p>
                      <p className="text-xs text-red-300/80 leading-relaxed">
                        Factory capacity is insufficient for the requested{" "}
                        <strong className="text-red-200">{summary.productionTarget?.toLocaleString()} units</strong>.
                        Maximum achievable:{" "}
                        <strong className="text-red-200">{summary.maximumPossibleProduction?.toLocaleString()} units</strong>
                        {summary.remainingUnits != null && (
                          <> &mdash; <strong className="text-red-200">{summary.remainingUnits?.toLocaleString()} units</strong> short.</>  
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {/* Deadline Status Banner */}
                {deadlineStatus && (
                  <div className={cn(
                    "flex items-center gap-3 px-5 py-3.5 rounded-xl border text-sm font-semibold",
                    deadlineStyle
                  )}>
                    {isDelayed ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
                    <span>Deadline Status: {deadlineStatus}</span>
                    {summary.deadline && (
                      <span className="ml-auto font-normal opacity-75">
                        Due {fmtDateTime(summary.deadline)}
                      </span>
                    )}
                  </div>
                )}

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {summaryCards.map((card) => (
                    <div
                      key={card.label}
                      className={cn(
                        "glass p-4 rounded-xl border-l-4 bg-gradient-to-br to-transparent",
                        card.color,
                        card.glow
                      )}
                    >
                      <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
                        {card.icon}
                        <p className="text-xs font-semibold uppercase tracking-wider">{card.label}</p>
                      </div>
                      <p className="text-xl font-bold truncate">
                        {card.value}
                        {"unit" in card && typeof card.value === "string" && card.value !== "—" && (
                          <span className="text-sm font-normal text-muted-foreground ml-1">{(card as any).unit}</span>
                        )}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Insufficient Capacity Extra Cards */}
                {insufficientCards.length > 0 && (
                  <div className="grid grid-cols-2 gap-4">
                    {insufficientCards.map((card) => (
                      <div
                        key={card.label}
                        className={cn(
                          "glass p-4 rounded-xl border-l-4 bg-gradient-to-br to-transparent ring-1 ring-red-500/20",
                          card.color,
                          card.glow
                        )}
                      >
                        <div className="flex items-center gap-1.5 text-red-400/80 mb-2">
                          {card.icon}
                          <p className="text-xs font-semibold uppercase tracking-wider">{card.label}</p>
                        </div>
                        <p className="text-2xl font-bold text-red-300 truncate">
                          {card.value}
                          <span className="text-sm font-normal text-red-400/70 ml-1">{card.unit}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Gantt Timeline ── */}
                {ganttData.length > 0 && (
                  <div className="glass p-6 rounded-xl border border-border/50">
                    <div className="flex items-center gap-2 mb-1">
                      <CalendarClock size={20} className="text-primary" />
                      <h3 className="text-lg font-semibold">Production Timeline</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mb-5">
                      X-axis = hours elapsed from first task start
                    </p>

                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={ganttData}
                          layout="vertical"
                          margin={{ left: 0, right: 24, top: 4, bottom: 4 }}
                          barCategoryGap="28%"
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" horizontal={false} />
                          <XAxis
                            type="number"
                            stroke="#aaa"
                            tick={{ fill: "#bbb", fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => `${v}h`}
                          />
                          <YAxis
                            type="category"
                            dataKey="label"
                            stroke="#aaa"
                            tick={{ fill: "#ccc", fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                            width={140}
                          />
                          <Tooltip content={<GanttTooltip />} />
                          {/* invisible offset */}
                          <Bar dataKey="start" stackId="g" fill="transparent" isAnimationActive={false} />
                          {/* visible duration bar */}
                          <Bar dataKey="duration" stackId="g" radius={[0, 6, 6, 0]}>
                            {ganttData.map((entry, i) => (
                              <Cell
                                key={i}
                                fill={MACHINE_COLORS[entry.machine] ?? DEFAULT_COLOR}
                                fillOpacity={0.88}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap gap-x-6 gap-y-3 mt-4 pt-4 border-t border-border/30">
                      {schedule.map((t) => (
                        <div key={`${t.machine}-${t.shift}`} className="flex items-center gap-2 text-xs">
                          <span
                            className="w-3 h-3 rounded-sm flex-shrink-0"
                            style={{ background: MACHINE_COLORS[t.machine] ?? DEFAULT_COLOR }}
                          />
                          <span className="font-semibold text-foreground">{t.machine}</span>
                          <span className="capitalize px-1.5 py-0.5 rounded bg-secondary/60 text-foreground/70">{t.shift}</span>
                          <span
                            className="font-bold"
                            style={{ color: MACHINE_COLORS[t.machine] ?? DEFAULT_COLOR }}
                          >
                            {t.allocatedUnits?.toLocaleString()} units
                          </span>
                          {t.unitsPerHour && (
                            <span className="text-muted-foreground">@ {t.unitsPerHour?.toLocaleString()}/hr</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Unit Allocation Bar Chart ── */}
                {allocData.length > 0 && (
                  <div className="glass p-6 rounded-xl border border-border/50">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp size={20} className="text-amber-400" />
                      <h3 className="text-lg font-semibold">Unit Allocation by Machine</h3>
                    </div>
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={allocData} margin={{ left: 0, right: 10, top: 4, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                          <XAxis
                            dataKey="machine"
                            stroke="#aaa"
                            tick={{ fill: "#ccc", fontSize: 12 }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            stroke="#aaa"
                            tick={{ fill: "#bbb", fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "rgba(15,15,20,0.95)",
                              borderColor: "rgba(255,255,255,0.1)",
                              borderRadius: 8,
                              fontSize: 12,
                            }}
                            formatter={(val: any, name: string) => [val.toLocaleString(), name]}
                          />
                          <Bar dataKey="units" name="Allocated Units" radius={[6, 6, 0, 0]}>
                            {allocData.map((entry, i) => (
                              <Cell
                                key={i}
                                fill={MACHINE_COLORS[entry.machine] ?? DEFAULT_COLOR}
                                fillOpacity={0.85}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* ── AI Insights ── */}
                {insights.length > 0 && (
                  <div className={cn(
                    "glass p-6 rounded-xl border",
                    isInsufficient ? "border-red-500/30 bg-red-500/5" : "border-border/50"
                  )}>
                    <div className="flex items-center gap-2 mb-4">
                      <Lightbulb size={20} className={isInsufficient ? "text-red-400" : "text-yellow-400"} />
                      <h3 className="text-lg font-semibold">AI Insights</h3>
                      {isInsufficient && (
                        <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                          Capacity Issue
                        </span>
                      )}
                    </div>
                    <div className="space-y-3">
                      {insights.map((insight, i) => (
                        <div
                          key={i}
                          className={cn(
                            "flex items-start gap-3 p-4 rounded-lg border transition-colors duration-200",
                            isInsufficient
                              ? "bg-red-500/8 border-red-500/20 hover:border-red-500/40"
                              : "bg-primary/5 border-primary/15 hover:border-primary/35"
                          )}
                        >
                          <span className={cn(
                            "flex-shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center mt-0.5",
                            isInsufficient
                              ? "bg-red-500/20 text-red-300"
                              : "bg-primary/20 text-primary"
                          )}>
                            {i + 1}
                          </span>
                          <p className={cn(
                            "text-sm leading-relaxed",
                            isInsufficient ? "text-red-200/90" : "text-foreground/85"
                          )}>{insight}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Raw JSON Accordion */}
                <div className="glass rounded-xl border border-border/50 overflow-hidden">
                  <button
                    onClick={() => setShowRaw(!showRaw)}
                    className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span>Raw Webhook Response</span>
                    {showRaw ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {showRaw && (
                    <pre className="p-5 text-xs bg-secondary/20 overflow-auto max-h-96 text-muted-foreground border-t border-border/50">
                      {rawResponse}
                    </pre>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
