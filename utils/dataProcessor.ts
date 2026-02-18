
import { read, utils } from 'xlsx';
import { InventoryItem, RawRow, AnalysisResult, RiskCategory, AggregatedAnalysis } from '../types';

// Helper to normalize headers for fuzzy matching
const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

const COLUMN_MAPPING = {
  sku: ['sku'],
  dc: ['rowlabels', 'dc', 'location', 'site', 'plant'],
  demandType: ['demandtype', 'type', 'category'],
  // MOH Components
  mohBase: ['moh'],
  transit: ['transit'],
  woo: ['woo'],
  // Metrics - Strictly target the specific accuracy string provided by the user
  // We explicitly avoid 'forecast' or 'acc' alone to prevent unit forecast mapping
  accuracy: ['3mactualsvforecastaccuracy'],
  onHand: ['onhand', 'stock', 'quantity', 'oh'],
  threeMonthActuals: ['3mactuals', 'sales', 'usage', 'consumption', 'demand'],
  supplier: ['supplier', 'vendor', 'source'],
  leadTime: ['leadtime', 'lt', 'lead_time', 'days'],
  otd: ['otd', 'ontime', 'delivery', 'performance']
};

const findKey = (row: RawRow, possibleKeys: string[]): string | undefined => {
  const rowKeys = Object.keys(row);
  
  // Specific override for accuracy to ensure we get the right column
  if (possibleKeys.includes('3mactualsvforecastaccuracy')) {
    const strictMatch = rowKeys.find(key => {
      const n = normalize(key);
      return n.includes('3mactualsvforecast') && n.includes('accuracy');
    });
    if (strictMatch) return strictMatch;
  }

  return rowKeys.find(key => possibleKeys.some(pk => normalize(key).includes(pk)));
};

export const parseFile = async (file: File): Promise<InventoryItem[]> => {
  const data = await file.arrayBuffer();
  const workbook = read(data);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = utils.sheet_to_json<RawRow>(worksheet);

  if (jsonData.length === 0) return [];

  const firstRow = jsonData[0];
  const map: Record<keyof typeof COLUMN_MAPPING, string | undefined> = {
    sku: findKey(firstRow, COLUMN_MAPPING.sku),
    dc: findKey(firstRow, COLUMN_MAPPING.dc),
    demandType: findKey(firstRow, COLUMN_MAPPING.demandType),
    mohBase: findKey(firstRow, COLUMN_MAPPING.mohBase),
    transit: findKey(firstRow, COLUMN_MAPPING.transit),
    woo: findKey(firstRow, COLUMN_MAPPING.woo),
    accuracy: findKey(firstRow, COLUMN_MAPPING.accuracy),
    onHand: findKey(firstRow, COLUMN_MAPPING.onHand),
    threeMonthActuals: findKey(firstRow, COLUMN_MAPPING.threeMonthActuals),
    supplier: findKey(firstRow, COLUMN_MAPPING.supplier),
    leadTime: findKey(firstRow, COLUMN_MAPPING.leadTime),
    otd: findKey(firstRow, COLUMN_MAPPING.otd),
  };

  return jsonData.map((row, index) => {
    const getString = (key: string | undefined) => (key && row[key] ? String(row[key]) : 'Unknown');
    
    const parseNumeric = (key: string | undefined): number => {
      const raw = key && row[key] !== undefined ? row[key] : 0;
      if (typeof raw === 'string') {
        const norm = raw.toUpperCase().trim();
        if (norm === 'NO SALE' || norm === 'N/A' || norm === '-') return 0;
        return parseFloat(raw) || 0;
      }
      return Number(raw) || 0;
    };

    // Rule: mohtotal = mohbase + transit + woo
    const mohBase = parseNumeric(map.mohBase);
    const transit = parseNumeric(map.transit);
    const woo = parseNumeric(map.woo);
    const mohTotal = mohBase + transit + woo;

    // Accuracy Parsing Logic - Ensuring percentages are handled and large numbers are scaled
    let accuracyValue = parseNumeric(map.accuracy);
    const rawAcc = map.accuracy ? row[map.accuracy] : null;
    
    if (typeof rawAcc === 'string' && rawAcc.includes('%')) {
      accuracyValue = parseFloat(rawAcc.replace('%', '')) / 100;
    } else if (accuracyValue > 1.1) {
      // If we accidentally get 85 (meaning 85%), scale it to 0.85
      // This helps if the column is whole numbers instead of decimals
      accuracyValue = accuracyValue / 100;
    }

    // Parse OTD
    let otdValue = parseNumeric(map.otd);
    const rawOtd = map.otd ? row[map.otd] : null;
    if (typeof rawOtd === 'string' && rawOtd.includes('%')) {
      otdValue = parseFloat(rawOtd.replace('%', '')) / 100;
    } else if (otdValue > 1.1) {
      otdValue = otdValue / 100;
    } else if (!map.otd) {
      otdValue = 1.0; 
    }

    return {
      id: `row-${index}`,
      sku: getString(map.sku),
      dc: getString(map.dc),
      demandType: getString(map.demandType),
      mohBase,
      transit,
      woo,
      mohTotal,
      accuracy: accuracyValue,
      onHand: parseNumeric(map.onHand),
      threeMonthActuals: parseNumeric(map.threeMonthActuals),
      supplier: map.supplier ? getString(map.supplier) : 'N/A',
      leadTime: parseNumeric(map.leadTime),
      otd: otdValue,
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
    if (item.mohTotal > 0 && item.mohTotal <= 2 && item.accuracy >= 0.8) {
      shortfall.push({ item, risks: [RiskCategory.SHORTFALL] });
    }

    // Rule 2: Oversupply
    if (item.mohTotal > 2 && item.accuracy <= 0.8) {
      oversupply.push({ item, risks: [RiskCategory.OVERSUPPLY] });
    }

    // Rule 3: Dead Stock
    if (item.onHand > 0 && item.threeMonthActuals === 0) {
      deadStock.push({ item, risks: [RiskCategory.DEAD_STOCK] });
    }

    // Rule 4: Supplier Risk
    if (item.leadTime > 60 || item.otd < 0.85) {
      supplierRisk.push({ item, risks: [RiskCategory.SUPPLIER_RISK] });
    }
  });

  return { 
    shortfall, 
    oversupply, 
    deadStock, 
    supplierRisk, 
    allItems: items, 
    totalItems: items.length
  };
};
