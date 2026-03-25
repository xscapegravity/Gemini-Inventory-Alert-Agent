import { AggregatedAnalysis } from '../types';

export const generateExecutiveReport = async (
  analysis: AggregatedAnalysis, 
  accessToken: string,
  diagnosticMode: boolean = false
) => {
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ analysis, diagnosticMode }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server responded with ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error("Gemini Service Error:", error);
    throw new Error(`Intelligence Error: ${error.message || "Failed to generate AI report."}`);
  }
};
