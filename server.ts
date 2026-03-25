import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  console.log("[server] Initializing Inventory Agent Backend...");
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // API routes
  app.get("/api/health", (req, res) => {
    const apiKey = (process.env.GEMINI_API_KEY || process.env.API_KEY || "").trim();
    res.json({ 
      status: "online", 
      version: "1.3.0", 
      engine: "typescript",
      has_api_key: apiKey.length > 0 
    });
  });

  app.post("/api/analyze", async (req, res) => {
    const { analysis, diagnosticMode } = req.body;
    const apiKey = (process.env.GEMINI_API_KEY || process.env.API_KEY || "").trim();
    const serverAccessToken = process.env.ACCESS_TOKEN || process.env.VITE_ACCESS_TOKEN;
    const clientAccessToken = req.headers['x-access-token'];

    if (serverAccessToken && clientAccessToken !== serverAccessToken) {
      return res.status(401).json({ error: "Unauthorized: Invalid access token." });
    }

    if (!apiKey) {
      return res.status(500).json({ error: "The AI service is currently unavailable because the Gemini API Key is missing on the server. Please contact the administrator." });
    }

    if (diagnosticMode) {
      return res.json({ emailText: "Diagnostic OK", htmlDashboard: "<div>Diagnostic OK</div>" });
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const model = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              emailText: { type: Type.STRING, description: "Professional executive summary email" },
              htmlDashboard: { type: Type.STRING, description: "Interactive HTML dashboard with Tailwind CSS" }
            },
            required: ["emailText", "htmlDashboard"]
          }
        },
        contents: [
          {
            parts: [
              {
                text: `You are an expert Inventory Analyst. Analyze the following inventory risk data:
                
                SUMMARY:
                - Total Items: ${analysis.totalItems}
                - Shortfalls: ${analysis.shortfall.length}
                - Oversupply: ${analysis.oversupply.length}
                - Dead Stock: ${analysis.deadStock.length}
                
                CRITICAL ITEMS:
                ${JSON.stringify([
                  ...analysis.shortfall.slice(0, 10).map((r: any) => ({ sku: r.item.sku, risk: 'Shortfall', moh: r.item.mohTotal })),
                  ...analysis.oversupply.slice(0, 5).map((r: any) => ({ sku: r.item.sku, risk: 'Oversupply', moh: r.item.mohTotal }))
                ], null, 2)}
                
                TASK:
                1. Write a professional Executive Summary email (emailText) to the Supply Chain Director.
                   The email MUST include:
                   - A clear Subject Line at the top.
                   - A formal greeting (e.g., Dear Supply Chain Director,).
                   - Multiple paragraphs explaining the current inventory status, risks (shortfalls, oversupply, dead stock), and recommended actions.
                   - Use bullet points for key items if necessary.
                   - A professional sign-off and signature block.
                   - Use standard line breaks (\n) between sections and paragraphs.
                2. Create a clean, interactive HTML dashboard (htmlDashboard) using Tailwind CSS. Use a dark theme with indigo accents.`
              }
            ]
          }
        ]
      });

      const text = model.text;
      if (!text) {
        throw new Error("Empty response from AI");
      }

      res.json(JSON.parse(text));
    } catch (error: any) {
      console.error("[server] Gemini Error:", error);
      let errorMessage = error.message || "Failed to generate AI report";
      
      // Detect common Gemini API key issues (expired, invalid, missing)
      if (errorMessage.includes("API_KEY_INVALID") || 
          errorMessage.includes("API key expired") || 
          errorMessage.includes("INVALID_ARGUMENT") ||
          errorMessage.includes("400") ||
          errorMessage.includes("403")) {
        errorMessage = "The AI service is currently unavailable due to an invalid or expired API key. Please contact the administrator to renew the GEMINI_API_KEY in the environment settings.";
      }
      
      res.status(500).json({ error: errorMessage });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[server] Inventory Agent Backend v1.3.0`);
    console.log(`[server] Running on port ${PORT}`);
  });
}

startServer();
