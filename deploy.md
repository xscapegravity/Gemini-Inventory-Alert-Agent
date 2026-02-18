# Deployment Guide: Inventory Alert Agent

This guide outlines the steps to deploy the Inventory Alert Agent to major cloud providers. The architecture uses a **Unified Hosting** model where the Python Flask backend serves the static frontend assets.

---

## Prerequisites
1.  **Google Gemini API Key**: Obtain from [Google AI Studio](https://aistudio.google.com/).
2.  **Access Token**: Your chosen agent passcode (e.g., `yuKVek24`).
3.  **Docker** (Optional, recommended for GCP/Digital Ocean).

---

## 1. Google Cloud Platform (GCP) - Cloud Run
Cloud Run is the recommended path for GCP as it handles scaling and SSL automatically.

### Steps:
1.  **Create a Dockerfile** in the root:
    ```dockerfile
    FROM python:3.11-slim
    WORKDIR /app
    COPY requirements.txt .
    RUN pip install -r requirements.txt
    COPY . .
    CMD ["python", "app.py"]
    ```
2.  **Build and Push**:
    ```bash
    gcloud builds submit --tag gcr.io/[PROJECT_ID]/inventory-agent
    ```
3.  **Deploy**:
    ```bash
    gcloud run deploy inventory-agent \
      --image gcr.io/[PROJECT_ID]/inventory-agent \
      --platform managed \
      --allow-unauthenticated \
      --set-env-vars API_KEY=[YOUR_KEY],ACCESS_TOKEN=yuKVek24
    ```

---

## 2. Microsoft Azure - App Service
Azure App Service provides a native Python environment that is easy to manage via the Azure Portal.

### Steps:
1.  **Create App Service**:
    - Select **Python 3.11** as the runtime stack.
    - Choose **Linux** as the Operating System.
2.  **Configuration**:
    - Go to **Settings > Configuration > Application Settings**.
    - Add `API_KEY`: `[YOUR_GEMINI_KEY]`
    - Add `ACCESS_TOKEN`: `yuKVek24`
    - Add `SCM_DO_BUILD_DURING_DEPLOYMENT`: `true`
3.  **Deployment**:
    - Use **Local Git** or connect your **GitHub** repository.
    - Azure will automatically detect `requirements.txt` and run the app.
    - Set the **Startup Command** to: `python app.py`

---

## 3. Digital Ocean - App Platform
Digital Ocean's App Platform is the simplest "Point and Click" deployment.

### Steps:
1.  **Launch App**:
    - Go to the **Apps** dashboard and click **Create App**.
    - Connect your GitHub repository.
2.  **Resource Configuration**:
    - App Platform will detect the Python environment.
    - Ensure the **HTTP Port** is set to `8080`.
3.  **Environment Variables**:
    - Add `API_KEY` (Encrypt it using the "Secret" toggle).
    - Add `ACCESS_TOKEN`.
4.  **Deploy**:
    - Click **Deploy**. Digital Ocean will build your container and provide a `.ondigitalocean.app` URL.

---

## 4. Post-Deployment Checklist
- [ ] **SSL/HTTPS**: Ensure your domain is using HTTPS (required for Gemini API browser calls).
- [ ] **Health Check**: Visit `[YOUR_URL]/api/health` to verify the backend is online.
- [ ] **CORS**: If hosting the frontend separately, ensure `flask-cors` in `app.py` is configured with your specific frontend domain.

## Common Troubleshooting
- **Error 401 Unauthorized**: Ensure your `Authorization` header in frontend requests matches the `ACCESS_TOKEN` set in the environment.
- **File Upload Limits**: Large Excel files may require increasing the client body limit on your load balancer (e.g., Nginx `client_max_body_size`).
