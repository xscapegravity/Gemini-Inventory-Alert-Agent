
# Inventory Alert Agent - System Architecture

## Executive Summary
The **Inventory Alert Agent** is a hybrid intelligence platform designed to bridge the gap between raw supply chain data and executive decision-making. It combines deterministic logic (data processing rules) with generative AI (Gemini 3 Pro) to identify risks and synthesize strategic reports.

---

## 1. System Components

### Frontend (React/TypeScript)
- **App Core (`App.tsx`):** Manages global state, authentication lifecycle, and high-level routing.
- **Data Processor (`utils/dataProcessor.ts`):** Handles client-side parsing of `.xlsx` and `.csv` files using `SheetJS`. It implements the "Business Rules Engine" to categorize inventory risks.
- **Diagnostic Engine (`components/TestSuite.tsx`):** An isolated testing environment that validates the accuracy of the analysis logic without exposing production data.
- **Visualization (`components/AnalysisDashboard.tsx`):** Utilizes `Recharts` for distribution and performance analytics.

### Backend (Python/Flask)
- **Service Layer (`app.py`):** Provides a secure interface for sensitive operations.
- **Cross-Origin Resource Sharing (CORS):** Configured to allow seamless communication between the React UI and the Flask API.

---

## 2. Security & Authentication

The application employs a dual-layer security model to protect supply chain intelligence.

### A. Agent Passcode
Access to the terminal is gated by a secure passcode mechanism:
- **Passcode:** `yuKVek24`
- **Implementation:** 
  - **Frontend:** Currently hardcoded in `App.tsx` (See `security_review.md` for risks).
  - **Backend:** Referenced via the `ACCESS_TOKEN` environment variable to authorize API requests.
- **Workflow:** Users must authenticate via the "Security Portal" before any data processing or AI modules are initialized.

### B. API Key Management
The system utilizes the **Google Gemini API** for generating executive summaries and interactive dashboards.
- **Injected Keys:** The API key is never hardcoded. It is accessed via `process.env.API_KEY` (Frontend) and `os.environ.get("API_KEY")` (Backend).

---

## 3. Data Processing Pipeline

1.  **Ingestion:** User uploads an inventory file.
2.  **Normalization:** Fuzzy matching maps varied header names (e.g., "SKU" vs "Material") to standardized properties.
3.  **Analysis (The 4 Rules):**
    - **Shortfall:** `0 < Months On Hand =< 2` + `Accuracy > 80%`.
    - **Oversupply:** `Months On Hand > 2` + `Accuracy < 80%`.
    - **Dead Stock:** `On Hand > 0` + `3m Sales = 0`.
    - **Supplier Risk:** `Lead Time > 60d` or `OTD < 85%`.
4.  **AI Synthesis:** The aggregated analysis is formatted as a JSON context and sent to Gemini 3 Pro.
5.  **Output:** The model returns a professional email draft and a self-contained HTML/Tailwind dashboard for export.

---

## 4. Documentation & Maintenance
- **Security Review:** Detailed analysis of vulnerabilities and fixes is in `security_review.md`.
- **Deployment Guide:** See `deploy.md` for GCP, Azure, and Digital Ocean instructions.
- **Diagnostic Testing:** The **Diagnostic Test Suite** performs unit testing on the analysis logic.

---

## 5. Deployment Specs
- **Web Server:** Static assets served from root by the Flask application.
- **API Server:** Flask running on port `8080`.
- **Modality:** Single-page application (SPA) with real-time browser-based data processing.
