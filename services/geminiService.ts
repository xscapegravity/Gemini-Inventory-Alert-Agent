
import { GoogleGenAI } from "@google/genai";
import { AggregatedAnalysis } from "../types";

// Initialize the Gemini API client using the environment's injected key
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

  return JSON.stringify({
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
  }, null, 2);
};

export const generateExecutiveReport = async (analysis: AggregatedAnalysis): Promise<{ emailText: string; htmlDashboard: string }> => {
  const dataContext = formatForAI(analysis);

  const prompt = `
    You are a World-Class Supply Chain Strategy Consultant and Inventory Analyst.
    
    DATA CONTEXT (JSON):
    ${dataContext}

    TASK:
    1. Write a high-impact Executive Summary in a professional email format addressed to the Director of Supply Chain. 
       - Highlight the most critical "Potential Shortfall" items.
       - Address "Supplier Risks" and their impact on fulfillment.
       - Recommend immediate actions for "Dead Stock".
    
    2. Create a self-contained interactive HTML/Tailwind/Chart.js dashboard.
       - It must be a single code block starting with \`\`\`html.
       - It should visualize the data provided in the context.
       - Use high-contrast colors (Red for risk, Green for healthy).

    Respond with the email text first, followed by the HTML dashboard in a markdown block.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        temperature: 0.7,
        topP: 0.95,
      }
    });

    const fullText = response.text || "";
    
    // Extract HTML dashboard using regex
    const htmlMatch = fullText.match(/```html([\s\S]*?)```/);
    const htmlDashboard = htmlMatch ? htmlMatch[1].trim() : "<!-- No dashboard generated -->";
    
    // The email text is everything else
    const emailText = fullText.replace(/```html[\s\S]*?```/, '').trim();

    return { emailText, htmlDashboard };
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(`AI Analysis failed: ${error.message || "Unknown error"}`);
  }
};
