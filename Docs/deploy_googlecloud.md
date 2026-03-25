# Deployment Guide: Inventory Alert Agent

This guide outlines the steps to deploy the Inventory Alert Agent to **Google Cloud Run** using continuous deployment from your GitHub repository: `https://github.com/xscapegravity/Gemini-Inventory-Alert-Agent.git`.

---

## 1. Prerequisites
1.  **Google Cloud Project**: Ensure you have a project created (e.g., `gen-lang-client-0007930604`).
2.  **GitHub Repository**: Your code must be pushed to the repository mentioned above.
3.  **Gemini API Key**: Obtain from [Google AI Studio](https://aistudio.google.com/).

---

## 2. Deployment Steps (via Google Cloud Console)

### Step 1: Create a Cloud Run Service
1.  Go to the [Cloud Run Console](https://console.cloud.google.com/run).
2.  Click **CREATE SERVICE**.
3.  Select **Continuously deploy from a repository**.
4.  Click **SET UP WITH CLOUD BUILD**.

### Step 2: Connect your GitHub Repository
1.  **Repository Provider**: Select **GitHub**.
2.  **Repository**: Select `xscapegravity/Gemini-Inventory-Alert-Agent`.
3.  **Build Configuration**:
    - **Branch**: `main` (or your primary branch).
    - **Build Type**: Select **Dockerfile**.
    - **Source location**: `/Dockerfile` (should be detected automatically).
4.  Click **SAVE**.

### Step 3: Configure Service Settings
1.  **Service Name**: `inventory-agent`.
2.  **Region**: Choose a region close to your users (e.g., `us-central1`).
3.  **Authentication**: Select **Allow unauthenticated invocations** (for public access).
4.  **Container, Networking, Security (Expand this section)**:
    - **Container Port**: Set this to `3000` (matches the app configuration).
    - **Environment Variables**: Add the following:
      - `GEMINI_API_KEY`: `[YOUR_GEMINI_API_KEY]`
      - `ACCESS_TOKEN`: `yuKVek24` (or your chosen passcode)
      - `NODE_ENV`: `production`

### Step 4: Deploy
1.  Click **CREATE**.
2.  Google Cloud will now pull your code from GitHub, build the Docker image, and deploy it.

---

## 3. Manual Deployment (via gcloud CLI)

If you prefer to deploy manually from your local machine or a CI/CD pipeline without connecting GitHub:

### 1. Build and Submit to Artifact Registry
```bash
# Replace [PROJECT_ID] with your actual project ID
gcloud builds submit --tag gcr.io/[PROJECT_ID]/inventory-agent .
```

### 2. Deploy to Cloud Run
```bash
gcloud run deploy inventory-agent \
  --image gcr.io/[PROJECT_ID]/inventory-agent \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3000 \
  --set-env-vars="GEMINI_API_KEY=[YOUR_KEY],ACCESS_TOKEN=yuKVek24,NODE_ENV=production"
```

---

## 4. Post-Deployment
- **URL**: Once the deployment is complete, Google Cloud will provide a public URL (e.g., `https://inventory-agent-xyz.a.run.app`).
- **Health Check**: Verify the backend is online by visiting `https://[YOUR_URL]/api/health`.

---

## 4. Troubleshooting
- **Build Fails**: Check the "Logs" tab in Cloud Build to see if there are errors during `npm install` or `npm run build`.
- **App Won't Start**: Ensure the **Container Port** is set to `3000` in the Cloud Run configuration.
- **API Key Invalid**: Ensure the `GEMINI_API_KEY` is correctly set in the environment variables.
