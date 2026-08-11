"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export function useDashboard() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setError(null);
      const [overview, trend, utilization, defectAnalysis, shiftPerformance, machines] = await Promise.all([
        api.get('/dashboard/overview'),
        api.get('/dashboard/production-trend?days=30'),
        api.get('/dashboard/machine-utilization'),
        api.get('/dashboard/defect-analysis'),
        api.get('/dashboard/shift-performance'),
        api.get('/dashboard/machines'),
      ]);

      const mappedData = {
        kpis: {
          oee: overview.oee,
          productionProgress: overview.production_progress_percentage,
          activeMachines: overview.machine_counts?.running ?? 0,
          totalMachines: Object.values(overview.machine_counts ?? {}).reduce((total: number, value: unknown) => total + Number(value ?? 0), 0),
          downtime: overview.downtime_hours,
          energyConsumption: overview.energy_consumption,
          qualityRate: 100 - (overview.total_defects || 0),
          defects: overview.total_defects || 0,
        },
        productionTrend: trend.map((item: any) => ({ day: item.date, actual: item.actual, target: item.target })),
        machineUtilization: utilization.map((item: any) => ({ name: item.machine_id, util: item.utilization, capacity: item.capacity })),
        defectAnalysis: defectAnalysis.map((item: any) => ({ name: item.defect_type, value: item.count })),
        shiftPerformance: shiftPerformance.map((item: any) => ({ shift: item.shift, ProductA: item.production, ProductB: item.defects, ProductC: item.defects })),
        machines: machines.map((machine: any) => ({
          id: machine.machine_id,
          name: machine.name,
          type: machine.type,
          status: machine.status,
          health: machine.health_score,
          temp: machine.latest_sensors?.temperature ?? 0,
          vib: machine.latest_sensors?.vibration ?? 0,
          power: machine.latest_sensors?.power_consumption ?? 0,
        })),
      };

      // Determine whether there is meaningful production data to show on the dashboard.
      const hasData = (overview.total_production && overview.total_production > 0) || (Array.isArray(trend) && trend.some((t: any) => Number(t.actual) > 0));
      // Attach flag to returned payload so UI can decide whether to show empty state.
      (mappedData as any).hasData = Boolean(hasData);

      setData(mappedData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // 30s auto-refresh
    return () => clearInterval(interval);
  }, []);

  return { data, isLoading, error, refetch: fetchData };
}
