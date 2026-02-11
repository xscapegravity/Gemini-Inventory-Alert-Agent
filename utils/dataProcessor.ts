import { read, utils } from 'xlsx';
import { InventoryItem, RawRow, AnalysisResult, RiskCategory, AggregatedAnalysis } from '../types';

// Helper to normalize headers for fuzzy matching
const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

const COLUMN_MAPPING = {
  sku: ['sku', 'item', 'product', 'material'],
  dc: ['rowlabels', 'dc', 'location', 'site', 'plant'],
  demandType: ['demandtype', 'type', 'category'],
  mohTotal: ['moh', 'monthsonhand', 'transit', 'moh+intransit', 'totalmoh'],
  accuracy: ['accuracy', 'forecastaccuracy', '3mactualsvforecast', 'acc'],
  onHand: ['onhand', 'stock', 'quantity', 'oh'],
  threeMonthActuals: ['3mactuals', 'sales', 'usage', 'consumption', 'demand'],
  // New Mappings
  supplier: ['supplier', 'vendor', 'source'],
  leadTime: ['leadtime', 'lt', 'lead_time', 'days'],
  otd: ['otd', 'ontime', 'delivery', 'performance']
};

const findKey = (row: RawRow, possibleKeys: string[]): string | undefined => {
  const rowKeys = Object.keys(row);
  return rowKeys.find(key => possibleKeys.some(pk => normalize(key).includes(pk)));
};

export const parseFile = async (file: File): Promise<InventoryItem[]> => {
  const data = await file.arrayBuffer();
  const workbook = read(data);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = utils.sheet_to_json<RawRow>(worksheet);

  if (jsonData.length === 0) return [];

  // Determine column mapping from the first row
  const firstRow = jsonData[0];
  const map: Record<keyof typeof COLUMN_MAPPING, string | undefined> = {
    sku: findKey(firstRow, COLUMN_MAPPING.sku),
    dc: findKey(firstRow, COLUMN_MAPPING.dc),
    demandType: findKey(firstRow, COLUMN_MAPPING.demandType),
    mohTotal: findKey(firstRow, COLUMN_MAPPING.mohTotal),
    accuracy: findKey(firstRow, COLUMN_MAPPING.accuracy),
    onHand: findKey(firstRow, COLUMN_MAPPING.onHand),
    threeMonthActuals: findKey(firstRow, COLUMN_MAPPING.threeMonthActuals),
    supplier: findKey(firstRow, COLUMN_MAPPING.supplier),
    leadTime: findKey(firstRow, COLUMN_MAPPING.leadTime),
    otd: findKey(firstRow, COLUMN_MAPPING.otd),
  };

  return jsonData.map((row, index) => {
    const getItem = (key: string | undefined) => (key && row[key] !== undefined ? row[key] : 0);
    const getString = (key: string | undefined) => (key && row[key] ? String(row[key]) : 'Unknown');

    // Parse percentages if they come in as strings like "80%"
    let acc = getItem(map.accuracy);
    if (typeof acc === 'string') {
      if (acc.includes('%')) {
        acc = parseFloat(acc.replace('%', '')) / 100;
      } else {
        acc = parseFloat(acc);
      }
    }

    let otd = getItem(map.otd);
    if (typeof otd === 'string') {
        if (otd.includes('%')) {
            otd = parseFloat(otd.replace('%', '')) / 100;
        } else {
            otd = parseFloat(otd);
        }
    } else {
        // If not found, default to 1.0 (100%) to avoid flagging everything if data is missing
        otd = map.otd ? Number(otd) : 1.0; 
    }

    return {
      id: `row-${index}`,
      sku: getString(map.sku),
      dc: getString(map.dc),
      demandType: getString(map.demandType),
      mohTotal: Number(getItem(map.mohTotal)),
      accuracy: Number(acc),
      onHand: Number(getItem(map.onHand)),
      threeMonthActuals: Number(getItem(map.threeMonthActuals)),
      supplier: map.supplier ? getString(map.supplier) : 'N/A',
      leadTime: map.leadTime ? Number(getItem(map.leadTime)) : 0,
      otd: Number(otd),
      originalData: row,
    };
  });
};

export const analyzeInventory = (items: InventoryItem[]): AggregatedAnalysis => {
  const shortfall: AnalysisResult[] = [];
  const oversupply: AnalysisResult[] = [];
  const deadStock: AnalysisResult[] = [];
  const supplierRisk: AnalysisResult[] = [];

  items.forEach(item => {
    // Rule 1: Potential Shortfall
    // moh_total < 2 AND accuracy >= 0.8
    if (item.mohTotal < 2 && item.accuracy >= 0.8) {
      shortfall.push({ item, risks: [RiskCategory.SHORTFALL] });
    }

    // Rule 2: Oversupply
    // moh_total > 2 AND accuracy < 0.8
    if (item.mohTotal > 2 && item.accuracy < 0.8) {
      oversupply.push({ item, risks: [RiskCategory.OVERSUPPLY] });
    }

    // Rule 3: Dead Stock
    // On Hand > 0 AND 3m Actuals == 0
    if (item.onHand > 0 && item.threeMonthActuals === 0) {
      deadStock.push({ item, risks: [RiskCategory.DEAD_STOCK] });
    }

    // Rule 4: Supplier Risk
    // Lead Time > 60 days OR OTD < 85%
    if (item.leadTime > 60 || item.otd < 0.85) {
        supplierRisk.push({ item, risks: [RiskCategory.SUPPLIER_RISK] });
    }
  });

  return {
    shortfall,
    oversupply,
    deadStock,
    supplierRisk,
    allItems: items, // Return all items for visualization context
    totalItems: items.length
  };
};
