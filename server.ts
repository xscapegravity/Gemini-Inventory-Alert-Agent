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

    if (!apiKey) {
      return res.status(500).json({ error: "Gemini API Key is missing on the server." });
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
      res.status(500).json({ error: error.message || "Failed to generate AI report" });
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
