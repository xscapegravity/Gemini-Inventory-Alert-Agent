export interface RawRow {
  [key: string]: string | number | undefined;
}

export interface InventoryItem {
  id: string; // generated UUID or index
  sku: string;
  dc: string;
  demandType: string;
  mohTotal: number;
  accuracy: number;
  onHand: number;
  threeMonthActuals: number;
  // New Supplier Metrics
  supplier: string;
  leadTime: number; // in days
  otd: number; // On-time delivery percentage (0.0 - 1.0)
  originalData: RawRow;
}

export enum RiskCategory {
  SHORTFALL = 'Potential Shortfall',
  OVERSUPPLY = 'Oversupply',
  DEAD_STOCK = 'Dead Stock',
  SUPPLIER_RISK = 'Supplier Risk',
  HEALTHY = 'Healthy'
}

export interface AnalysisResult {
  item: InventoryItem;
  risks: RiskCategory[];
}

export interface AggregatedAnalysis {
  shortfall: AnalysisResult[];
  oversupply: AnalysisResult[];
  deadStock: AnalysisResult[];
  supplierRisk: AnalysisResult[];
  allItems: InventoryItem[]; // Added for full dataset visualization
  totalItems: number;
}
