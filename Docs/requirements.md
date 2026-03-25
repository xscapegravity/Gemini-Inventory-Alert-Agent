# Inventory Alert Agent - Requirements Document


Do not delete

## 1. Project Overview
The **Inventory Alert Agent** is a specialized supply chain intelligence platform designed to process complex inventory data, identify critical risks, and synthesize executive-level reports using Artificial Intelligence. It serves as a bridge between raw data exports and strategic decision-making.

---

## 2. Functional Requirements

### 2.1. Authentication & Security
- **Passcode Protection**: The application must be gated by a "Security Portal" requiring a specific passcode (`yuKVek24`) to access the terminal.
- **Session Management**: Secure handling of access tokens for API requests to the backend.
- **Environment Security**: Sensitive API keys (Gemini) must be managed server-side and never exposed to the client.

### 2.2. Data Ingestion
- **File Support**: Support for `.xlsx` and `.csv` file formats.
- **Fuzzy Mapping**: Intelligent header mapping to handle variations in export formats (e.g., mapping "Row Labels" to "Location").
- **Data Normalization**: Automatic conversion of numeric strings, percentages, and null values (e.g., "NO SALE", "N/A") into clean numeric data.

### 2.3. Business Rules Engine (Analysis Logic)
The system must categorize inventory items into three primary risk categories based on deterministic logic:
1.  **Potential Shortfall**: 
    - Criteria: `Months On Hand (Total) > 0` AND `<= 2` AND `Accuracy >= 80%`.
    - Intent: Identify high-accuracy items at risk of stockout.
2.  **Oversupply**:
    - Criteria: `Months On Hand (Total) > 2` AND `Accuracy < 80%`.
    - Intent: Identify items where low forecast accuracy is leading to excess capital tie-up.
3.  **Dead Stock**:
    - Criteria: `On Hand > 0` AND `3-Month Sales Actuals == 0`.
    - Intent: Identify stagnant inventory with no recent movement.

### 2.4. Intelligence Dashboard
- **Executive Summary Cards**: Real-time counters for all risk categories and key metrics (WOO, Transit, Sales).
- **Visual Analytics**: Bar charts visualizing the distribution of risks across the dataset.
- **SKU Search**: Global search functionality to quickly locate specific items.
- **Drilldown Tables**: Sortable tables for each risk category with key performance indicators (MOH, Accuracy, On Hand).
- **SKU Inspector**: A detailed modal view for individual items showing:
    - Formula breakdown (MOH Base + Transit + WOO + Planned).
    - Risk status validation.
    - Historical sales metrics.

### 2.5. AI Synthesis & Reporting
- **Executive Briefing**: Integration with Gemini 2.5 Flash to generate a professional email summary for Supply Chain Directors.
- **Interactive HTML Report**: Generation of a self-contained, styled HTML dashboard for external sharing.
- **Contextual Awareness**: The AI must receive a summarized context of critical items and overall statistics to ensure accurate synthesis.

### 2.6. Data Export
- **CSV Download**: Ability to export the currently filtered view or the entire dataset as a standardized CSV file for further analysis in Excel or other tools.

### 2.7. Diagnostic Engine
- **Test Suite**: A built-in diagnostic module to run unit tests against the analysis logic using mock data, ensuring the "Business Rules Engine" remains accurate after updates.

---

## 3. Technical Requirements

### 3.1. Frontend Stack
- **Framework**: React 19 (TypeScript).
- **Styling**: Tailwind CSS 4.0.
- **Icons**: Lucide React.
- **Charts**: Recharts.
- **File Processing**: SheetJS (XLSX).

### 3.2. Backend Stack
- **Language**: Python 3.x.
- **Framework**: Flask.
- **AI Integration**: Google Generative AI SDK (Gemini 2.5 Flash).
- **Communication**: RESTful API with CORS support.

### 3.3. Deployment
- **Containerization**: Docker-ready with `Dockerfile` and `docker-compose.yml`.
- **Platform**: Optimized for Google Cloud Run or VPS hosting.

---

## 4. Non-Functional Requirements
- **Performance**: Client-side processing of up to 10,000 rows without significant UI lag.
- **Usability**: Modern, "Mission Control" aesthetic with high-contrast typography and intuitive navigation.
- **Reliability**: Graceful handling of malformed data or API timeouts during AI generation.
