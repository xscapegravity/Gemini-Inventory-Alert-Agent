import os
import sys
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import google.generativeai as genai
import json

print("--- Python Backend Starting ---")
print(f"Python version: {sys.version}")
print(f"Environment: {os.environ.get('NODE_ENV', 'development')}")

app = Flask(__name__, static_folder='dist')
CORS(app)

@app.route('/api/health')
def health():
    print("[backend] Health check requested")
    return jsonify({"status": "online", "version": "1.1.0", "engine": "python"})

@app.route('/api/analyze', methods=['POST'])
def analyze():
    print("[backend] POST /api/analyze received")
    token = request.headers.get('Authorization')
    if token != os.environ.get('ACCESS_TOKEN', 'yuKVek24'):
        print(f"[backend] Unauthorized token: {token}")
        return jsonify({"error": "Unauthorized Access Denied"}), 401

    api_key = os.environ.get('GEMINI_API_KEY') or os.environ.get('API_KEY') or ""
    api_key = api_key.strip().strip('"').strip("'")

    if not api_key:
        print("[backend] Error: No API Key found in environment")
        return jsonify({"error": "GEMINI_API_KEY is not configured. Please add it in the Settings menu of AI Studio."}), 500

    try:
        print(f"[backend] Configuring Gemini with key prefix: {api_key[:4]}...")
        genai.configure(api_key=api_key)
        
        # Use a stable model name
        model_name = 'gemini-3-flash-preview'
        print(f"[backend] Using model: {model_name}")
        model = genai.GenerativeModel(model_name)

        data = request.json
        context = data.get('context')
        diagnostic_mode = data.get('diagnosticMode')

        print(f"[backend] Context received. Size: {len(json.dumps(context)) if context else 0} bytes. Diagnostic: {diagnostic_mode}")

        if not context:
            return jsonify({"error": "Data Context Missing"}), 400

        if diagnostic_mode:
            return jsonify({"emailText": "Diagnostic OK", "htmlDashboard": "<div>OK</div>"})

        prompt = f"""
        You are an expert Inventory Analyst. Analyze the following inventory risk data:
        
        {json.dumps(context, indent=2)}

        TASK:
        1. Write a professional Executive Summary email (emailText) to the Supply Chain Director.
        2. Create a clean, interactive HTML dashboard (htmlDashboard) using Tailwind CSS.
           - The dashboard should visualize the 'criticalItems' and 'summary' data provided.
           - Use a professional, modern design with clear charts and tables.
        
        Return the result as a JSON object with keys 'emailText' and 'htmlDashboard'.
        """

        print("[backend] Calling Gemini API (generate_content)...")
        # Simplified call without complex schema first to see if it works
        response = model.generate_content(
            prompt,
            generation_config={
                "response_mime_type": "application/json",
            }
        )

        if not response.text:
            print("[backend] Error: Empty response from Gemini")
            raise Exception("Empty response from AI Model")

        print("[backend] Gemini response received successfully.")
        # Attempt to parse the JSON
        try:
            result = json.loads(response.text)
            # Ensure required keys exist
            if 'emailText' not in result: result['emailText'] = "Summary generated (fallback text)."
            if 'htmlDashboard' not in result: result['htmlDashboard'] = "<div>Dashboard generated (fallback).</div>"
            return jsonify(result)
        except json.JSONDecodeError:
            print(f"[backend] Error: Failed to parse AI response as JSON: {response.text[:100]}...")
            return jsonify({
                "emailText": response.text,
                "htmlDashboard": f"<div class='p-4 bg-slate-100 rounded-xl'>{response.text}</div>"
            })

    except Exception as e:
        print(f"[backend] AI Synthesis failed with exception: {type(e).__name__}: {e}")
        return jsonify({"error": f"Intelligence Failure: {str(e)}"}), 500

# Serve static files in production
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    # In this environment, Vite runs on 3000 in dev mode.
    # We must run the Flask API on a different port (8080) and proxy to it.
    # In production, Flask runs on 3000 and serves the static files.
    is_prod = os.environ.get('NODE_ENV') == 'production'
    port = int(os.environ.get('PORT', 3000)) if is_prod else 8080
    
    print(f"Starting Flask server on port {port} (Production: {is_prod})")
    app.run(host='0.0.0.0', port=port)
