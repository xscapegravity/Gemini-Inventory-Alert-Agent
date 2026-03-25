# Inventory Alert Agent - System Architecture

## Executive Summary
The **Inventory Alert Agent** is a hybrid intelligence platform designed to bridge the gap between raw supply chain data and executive decision-making. It combines deterministic logic (data processing rules) with generative AI (Gemini 3 Flash) to identify risks and synthesize strategic reports.

---

## 1. System Components

### Frontend (React/TypeScript)
- **App Core (`App.tsx`):** Manages global state, authentication lifecycle, and high-level routing.
- **Data Processor (`utils/dataProcessor.ts`):** Handles client-side parsing of `.xlsx` and `.csv` files using `SheetJS`. It implements the "Business Rules Engine" to categorize inventory risks.
- **Diagnostic Engine (`components/TestSuite.tsx`):** An isolated testing environment that validates the accuracy of the analysis logic without exposing production data.
- **Visualization (`components/AnalysisDashboard.tsx`):** Utilizes `Recharts` for distribution and performance analytics.

### Backend (Node.js/Express)
- **Service Layer (`server.ts`):** Provides a secure interface for sensitive operations, specifically AI report generation.
- **Vite Integration:** In development, Express uses Vite middleware to serve the frontend. In production, it serves pre-built static assets from the `dist/` directory.

---

## 2. Security & Authentication

The application employs a dual-layer security model to protect supply chain intelligence.

### A. Agent Passcode
Access to the terminal is gated by a secure passcode mechanism:
- **Passcode:** `yuKVek24`
- **Implementation:** 
  - **Frontend:** Managed in `App.tsx`. Users must authenticate via the "Security Portal" before any data processing or AI modules are initialized.
  - **Backend:** The `accessToken` is passed in the request body to authorize AI analysis requests.

### B. API Key Management
The system utilizes the **Google Gemini API** for generating executive summaries.
- **Server-Side Security:** The Gemini API key is managed exclusively on the server (`server.ts`) and is never exposed to the client. It is accessed via `process.env.GEMINI_API_KEY`.

---

## 3. Data Processing Pipeline

1.  **Ingestion:** User uploads an inventory file.
2.  **Normalization:** Fuzzy matching maps varied header names (e.g., "Row Labels" vs "Entity") to standardized properties.
3.  **Analysis (The 3 Primary Rules):**
    - **Shortfall:** `0 < Months On Hand =< 2` + `Accuracy >= 80%`.
    - **Oversupply:** `Months On Hand > 2` + `Accuracy < 80%`.
    - **Dead Stock:** `On Hand > 0` + `3m Sales = 0`.
4.  **AI Synthesis:** The aggregated analysis is formatted as a JSON context and sent to the backend API.
5.  **Output:** The Gemini 3 Flash model returns a professional, email-ready executive briefing displayed in a dedicated popup modal with "Copy Email" functionality.

---

## 4. Documentation & Maintenance
- **Requirements Document:** Detailed functional and technical specs are in `Docs/requirements.md`.
- **Deployment Guide:** See `Docs/deploy_googlecloud.md` for Google Cloud Run instructions.
- **Diagnostic Testing:** The **Diagnostic Test Suite** performs unit testing on the analysis logic.

---

## 5. Deployment Specs
- **Runtime:** Node.js.
- **Port:** 3000 (standardized for the platform).
- **Modality:** Full-stack application with client-side data processing and server-side AI integration.
