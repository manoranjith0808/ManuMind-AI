export interface WebhookSummary {
  totalProduction: number;
  totalDefects: number;
  averageUtilization: number;
  bestMachine: string;
  bestShift: string;
}

export interface ProductionTrendItem {
  date: string;
  actualUnits: number;
  target: number;
}

export interface MachineUtilizationItem {
  machine: string;
  utilization: number;
}

export interface DefectAnalysisItem {
  name: string;
  value: number;
}

export interface ShiftPerformanceItem {
  shift: string;
  productA: number;
  productB: number;
  productC: number;
}

export interface NormalizedWebhookData {
  summary: WebhookSummary;
  productionTrend: ProductionTrendItem[];
  machineUtilization: MachineUtilizationItem[];
  defectAnalysis: DefectAnalysisItem[];
  shiftPerformance: ShiftPerformanceItem[];
}

export function extractWebhookPayload(rawResponse: any): NormalizedWebhookData | null {
  if (!rawResponse) return null;

  let payload = rawResponse;

  // Handle format: { items: [ { json: { summary, productionTrend, ... } } ] }
  if (rawResponse?.items && Array.isArray(rawResponse.items) && rawResponse.items[0]?.json) {
    payload = rawResponse.items[0].json;
  } else if (Array.isArray(rawResponse) && rawResponse[0]?.json) {
    payload = rawResponse[0].json;
  } else if (rawResponse?.json) {
    payload = rawResponse.json;
  }

  if (!payload || typeof payload !== "object") return null;

  const rawSummary = payload.summary || {};
  const summary: WebhookSummary = {
    totalProduction: Number(rawSummary.totalProduction ?? rawSummary.total_production ?? 0),
    totalDefects: Number(rawSummary.totalDefects ?? rawSummary.total_defects ?? 0),
    averageUtilization: Number(rawSummary.averageUtilization ?? rawSummary.average_utilization ?? 0),
    bestMachine: String(rawSummary.bestMachine ?? rawSummary.best_machine ?? "N/A"),
    bestShift: String(rawSummary.bestShift ?? rawSummary.best_shift ?? "N/A"),
  };

  const productionTrend: ProductionTrendItem[] = Array.isArray(payload.productionTrend)
    ? payload.productionTrend.map((item: any) => ({
        date: String(item.date || item.day || ""),
        actualUnits: Number(item.actualUnits ?? item.actual ?? 0),
        target: Number(item.target ?? 0),
      }))
    : [];

  const machineUtilization: MachineUtilizationItem[] = Array.isArray(payload.machineUtilization)
    ? payload.machineUtilization.map((item: any) => ({
        machine: String(item.machine || item.name || item.machine_id || ""),
        utilization: Number(item.utilization ?? item.util ?? 0),
      }))
    : [];

  const defectAnalysis: DefectAnalysisItem[] = Array.isArray(payload.defectAnalysis)
    ? payload.defectAnalysis.map((item: any) => ({
        name: String(item.name || item.defect_type || ""),
        value: Number(item.value ?? item.count ?? 0),
      }))
    : [];

  const shiftPerformance: ShiftPerformanceItem[] = Array.isArray(payload.shiftPerformance)
    ? payload.shiftPerformance.map((item: any) => ({
        shift: String(item.shift || ""),
        productA: Number(item.productA ?? item.ProductA ?? item.production ?? 0),
        productB: Number(item.productB ?? item.ProductB ?? 0),
        productC: Number(item.productC ?? item.ProductC ?? 0),
      }))
    : [];

  return {
    summary,
    productionTrend,
    machineUtilization,
    defectAnalysis,
    shiftPerformance,
  };
}
