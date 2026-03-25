# 🚀 Deployment Handover: Gemini Inventory Alert Agent

This document outlines the steps to deploy and maintain the Inventory Alert Agent on a Hostinger VPS using Docker.

---

## 📋 System Overview
* **Host:** `srv1383735.hstgr.cloud`
* **Source Code:** [GitHub Repository](https://github.com/xscapegravity/Gemini-Inventory-Alert-Agent.git)
* **Technology Stack:** Node.js (v20+), TypeScript, Vite, Docker, Gemini 3 API.
* **Internal Port:** `3000`
* **External Port:** `8080` (Standard) or `80` (If available).

---

## 🛠️ Step-by-Step Deployment

### 1. Server Environment Setup
Ensure Docker and Git are installed on the VPS:
```bash
sudo apt update && sudo apt install docker.io docker-compose git -y
```

### 2. Clone and Configure
Navigate to your application directory and pull the latest code:
```bash
cd /opt
git clone https://github.com/xscapegravity/Gemini-Inventory-Alert-Agent.git
cd Gemini-Inventory-Alert-Agent
```

Create a `.env` file to store your credentials:
```bash
nano .env
```
**Add the following content (Updated for March 2026 Model IDs):**
```env
GEMINI_API_KEY=your_google_api_key
# Recommended 2026 Model IDs: gemini-3-flash or gemini-2.5-flash
GEMINI_MODEL=gemini-3-flash
PORT=3000
```

### 3. Docker Configuration
Your `Dockerfile` uses `tsx` to run TypeScript directly for rapid deployment:

**`Dockerfile`**
```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
# Important: Use npx tsx to execute .ts files in Node 20+
CMD ["npx", "tsx", "server.ts"]
```

**`docker-compose.yml`**
```yaml
version: '3.8'
services:
  inventory-agent:
    build: .
    container_name: gemini-inventory-agent
    ports:
      - "8080:3000"
    env_file:
      - .env
    restart: always
```

### 4. Build and Launch (Docker)
Run the following to start the container in the background:
```bash
docker-compose up --build -d
```

---

## 🚀 Manual Deployment (Without Docker)

If you prefer to run the application directly on the host using **PM2**:

### 1. Install Node.js & PM2
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

### 2. Install Dependencies & Build
```bash
npm install
npm run build
```

### 3. Start with PM2
```bash
# Start the server using tsx (for rapid deployment)
pm2 start "npx tsx server.ts" --name inventory-agent

# OR: Start the production build (if you've compiled it)
# pm2 start dist/server.js --name inventory-agent
```

### 4. Configure Startup
```bash
pm2 save
pm2 startup
```

---

## 🔍 Maintenance & Troubleshooting

### Check Status & Logs
If the application isn't responding, check the logs for API or runtime errors:
```bash
docker ps                          # Verify container is 'Up'
docker logs -f gemini-inventory-agent  # View real-time logs
```

### Update the Application
To pull new changes from GitHub and redeploy:
```bash
git pull origin main
docker-compose up --build -d
```

### Common 2026 Errors
* **404 Model Not Found:** Ensure `GEMINI_MODEL` is set to a currently supported model (e.g., `gemini-3-flash`). Avoid deprecated `1.5` or `2.0` versions.
* **Port 80 Conflict:** Hostinger often runs Apache/Nginx by default. If you need port 80, stop the local service: `sudo systemctl stop apache2`.

---

## 🔗 Access
The application is accessible at:
**`http://srv1383735.hstgr.cloud:8080`**
