import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import cors from "cors";
import os from "os";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "online", version: "1.1.0" });
  });

  app.post("/api/analyze", async (req, res) => {
    const token = req.header('Authorization');
    if (token !== (process.env.ACCESS_TOKEN || "yuKVek24")) {
      return res.status(401).json({ error: "Unauthorized Access Denied" });
    }

    let apiKey = (process.env.GEMINI_API_KEY || process.env.API_KEY || "").trim();
    apiKey = apiKey.replace(/^["']|["']$/g, '');
    
    const keyPrefix = apiKey.substring(0, 4);
    console.log(`[server] API Key present: ${!!apiKey}, length: ${apiKey.length}, prefix: ${keyPrefix}...`);
    
    if (!apiKey) {
      return res.status(500).json({ 
        error: "GEMINI_API_KEY is not configured. Please add it in the Settings menu of AI Studio." 
      });
    }
    
    if (!apiKey.startsWith("AIza")) {
      console.warn("[server] Warning: API Key does not start with 'AIza'. This is likely an invalid Google API key.");
    }
    
    const ai = new GoogleGenAI({ apiKey });

    try {
      const { context, diagnosticMode } = req.body;
      if (!context) {
        return res.status(400).json({ error: "Data Context Missing" });
      }

      if (diagnosticMode) {
        return res.json({ emailText: "Diagnostic OK", htmlDashboard: "<div>OK</div>" });
      }

      const prompt = `
        You are an expert Inventory Analyst. Analyze the following inventory risk data:
        
        ${JSON.stringify(context, null, 2)}

        TASK:
        1. Write a professional Executive Summary email (emailText) to the Supply Chain Director.
        2. Create a clean, interactive HTML dashboard (htmlDashboard) using Tailwind CSS.
           - The dashboard should visualize the 'criticalItems' and 'summary' data provided.
           - Use a professional, modern design with clear charts and tables.
        `;

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              emailText: { type: 'STRING' },
              htmlDashboard: { type: 'STRING' }
            },
            required: ['emailText', 'htmlDashboard']
          }
        }
      });

      if (!response.text) {
        throw new Error("Empty response from AI Model");
      }

      const result = JSON.parse(response.text);
      res.json(result);
    } catch (error: any) {
      console.error("AI Synthesis failed:", error);
      res.status(500).json({ error: `Intelligence Failure: ${error.message}` });
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
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
