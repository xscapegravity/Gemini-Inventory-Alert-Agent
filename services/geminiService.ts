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
        'x-access-token': accessToken,
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
    // If the error message is already friendly (from our server), just throw it
    const message = error.message || "Failed to generate AI report.";
    if (message.includes("API key") || message.includes("AI service")) {
      throw new Error(message);
    }
    throw new Error(`Intelligence Error: ${message}`);
  }
};
