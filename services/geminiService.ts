
import { AggregatedAnalysis } from "../types";

const formatForAI = (analysis: AggregatedAnalysis) => {
  const getTop = (list: any[]) => list.slice(0, 30).map(r => ({
    sku: r.item.sku,
    dc: r.item.dc,
    moh: r.item.mohTotal,
    accuracy: (r.item.accuracy * 100).toFixed(1) + '%',
    onHand: r.item.onHand,
    sales3m: r.item.threeMonthActuals,
    supplier: r.item.supplier,
    leadTime: r.item.leadTime + 'd',
    otd: (r.item.otd * 100).toFixed(0) + '%'
  }));

  return {
    summary: {
      totalItems: analysis.totalItems,
      shortfallCount: analysis.shortfall.length,
      oversupplyCount: analysis.oversupply.length,
      deadStockCount: analysis.deadStock.length,
      supplierRiskCount: analysis.supplierRisk.length
    },
    criticalItems: {
      shortfalls: getTop(analysis.shortfall),
      oversupply: getTop(analysis.oversupply),
      deadStock: getTop(analysis.deadStock),
      supplierRisks: getTop(analysis.supplierRisk)
    }
  };
};

/**
 * Sends analysis context to the Python backend for AI synthesis.
 * @param analysis The aggregated inventory data.
 * @param token The auth token.
 * @param diagnosticMode If true, requests a lightweight connectivity check instead of a full report.
 */
export const generateExecutiveReport = async (
  analysis: AggregatedAnalysis, 
  token: string, 
  diagnosticMode = false
): Promise<{ emailText: string; htmlDashboard: string }> => {
  const targetUrl = '/api/analyze';
  console.log(`[GeminiService] Starting report generation.`);
  console.log(`[GeminiService] Mode: ${diagnosticMode ? 'Diagnostic (Lightweight)' : 'Production (Full)'}`);
  console.log(`[GeminiService] Target URL: ${window.location.origin}${targetUrl}`);
  
  const context = formatForAI(analysis);

  // Shorter timeout for diagnostics (10s) vs full report (60s)
  const timeoutDuration = diagnosticMode ? 10000 : 60000;
  const controller = new AbortController();
  const id = setTimeout(() => {
      console.warn(`[GeminiService] Request timed out after ${timeoutDuration}ms`);
      controller.abort();
  }, timeoutDuration);

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      // Pass the diagnosticMode flag to the backend
      body: JSON.stringify({ context, diagnosticMode }),
      signal: controller.signal
    });

    clearTimeout(id);
    console.log(`[GeminiService] Response received. Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown server error" }));
      console.error(`[GeminiService] Server Error Body:`, errorData);
      throw new Error(errorData.error || `Server error (${response.status})`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error(diagnosticMode 
        ? "Diagnostic ping timed out. Backend is unresponsive." 
        : "AI synthesis timed out. The report generation took too long - please try again.");
    }
    console.error("AI Analysis Communication Error:", error);
    throw new Error(error.message || "Failed to communicate with intelligence server.");
  }
};
