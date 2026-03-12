# Deployment Guide: Inventory Alert Agent

This guide outlines the steps to deploy the Inventory Alert Agent to Google Cloud Run for the project: **gen-lang-client-0007930604**.

---

## Prerequisites
1.  **Google Gemini API Key**: Obtain from [Google AI Studio](https://aistudio.google.com/).
2.  **Google Cloud SDK**: Install the `gcloud` CLI on your local machine.
3.  **Project ID**: `gen-lang-client-0007930604`

---

## 1. Google Cloud Platform (GCP) - Cloud Run
Cloud Run is the recommended path for GCP as it handles scaling and SSL automatically.

### Steps:

1.  **Configure gcloud**:
    ```bash
    gcloud config set project gen-lang-client-0007930604
    ```

2.  **Build and Push using Cloud Build**:
    This command builds your container image and pushes it to Google Artifact Registry.
    ```bash
    gcloud builds submit --tag gcr.io/gen-lang-client-0007930604/inventory-agent
    ```

3.  **Deploy to Cloud Run**:
    ```bash
    gcloud run deploy inventory-agent \
      --image gcr.io/gen-lang-client-0007930604/inventory-agent \
      --platform managed \
      --region us-central1 \
      --allow-unauthenticated \
      --set-env-vars GEMINI_API_KEY=[YOUR_KEY],ACCESS_TOKEN=yuKVek24,NODE_ENV=production
    ```

---

## 2. Post-Deployment Checklist
- [ ] **Health Check**: Visit `https://[YOUR_CLOUD_RUN_URL]/api/health` to verify the backend is online.
- [ ] **Environment Variables**: Ensure `GEMINI_API_KEY` and `ACCESS_TOKEN` are set in the Cloud Run service configuration.

## Common Troubleshooting
- **Error 401 Unauthorized**: Ensure your `Authorization` header in frontend requests matches the `ACCESS_TOKEN` set in the environment.
- **Port Binding**: The application is configured to listen on port `3000`. Cloud Run expects traffic on this port.
- **API Key Invalid**: Ensure the `GEMINI_API_KEY` set in Cloud Run is a valid key with access to the Generative Language API.
