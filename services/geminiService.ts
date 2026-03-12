import { AggregatedAnalysis } from '../types';

export const generateExecutiveReport = async (
  analysis: AggregatedAnalysis, 
  accessToken: string,
  diagnosticMode: boolean = false
) => {
  // Prepare a compact version of the data for the AI
  const context = {
    summary: {
      totalItems: analysis.totalItems,
      shortfallCount: analysis.shortfall.length,
      oversupplyCount: analysis.oversupply.length,
      deadStockCount: analysis.deadStock.length
    },
    criticalItems: [
      ...analysis.shortfall.slice(0, 10).map(r => ({
        sku: r.item.sku,
        risk: 'Shortfall',
        moh: r.item.mohTotal,
        onHand: r.item.onHand,
        accuracy: r.item.accuracy
      })),
      ...analysis.oversupply.slice(0, 5).map(r => ({
        sku: r.item.sku,
        risk: 'Oversupply',
        moh: r.item.mohTotal,
        onHand: r.item.onHand,
        accuracy: r.item.accuracy
      }))
    ]
  };

  try {
    // Attempt to call the local API
    // We use a timeout to handle cases where the backend is not responding
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout for AI generation

    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': accessToken
      },
      body: JSON.stringify({ context, diagnosticMode }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server responded with ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error("AI Synthesis timed out. The data set might be too large or the model is busy.");
    }
    
    // Fallback/Retry logic for common network issues
    console.error("Gemini Service Error:", error);
    throw error;
  }
};
