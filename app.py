
import os
import json
import logging
import re
import time
from flask import Flask, request, jsonify, send_from_directory
from google import genai
from google.genai import types
from flask_cors import CORS

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Security: Shared secret for internal API calls
ACCESS_TOKEN = os.environ.get("ACCESS_TOKEN", "yuKVek24")
SERVER_VERSION = "1.1.0"
START_TIME = time.time()

def clean_json_text(text):
    """Removes markdown code blocks if present to ensure valid JSON."""
    if not text:
        return ""
    pattern = r"```json\s*(.*?)\s*```"
    match = re.search(pattern, text, re.DOTALL)
    if match:
        return match.group(1)
    return text.strip()

@app.before_request
def log_request_info():
    """Log details about every incoming request for debugging."""
    if request.path.startswith('/api'):
        logger.info(f"Incoming API Request: {request.method} {request.path}")
        logger.debug(f"Headers: {request.headers}")

@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/health', methods=['GET'])
def health_check():
    """Simple health check endpoint to verify server is running and reachable."""
    logger.info("Health check endpoint hit.")
    uptime = int(time.time() - START_TIME)
    return jsonify({
        "status": "online", 
        "message": "Server is running",
        "version": SERVER_VERSION,
        "uptime_seconds": uptime
    }), 200

@app.route('/api/analyze', methods=['POST'])
def analyze():
    # Verify token to prevent unauthorized AI usage
    token = request.headers.get('Authorization')
    if token != ACCESS_TOKEN:
        logger.warning(f"Unauthorized access attempt. Token provided: {token[:4]}***")
        return jsonify({"error": "Unauthorized Access Denied"}), 401

    try:
        api_key = os.environ.get("API_KEY")
        if not api_key:
            logger.error("API_KEY environment variable is not set.")
            return jsonify({"error": "Server Configuration Error: API_KEY Missing"}), 500
            
        client = genai.Client(api_key=api_key)
        data = request.json
        context = data.get('context')
        is_diagnostic = data.get('diagnosticMode', False)

        if not context:
            logger.error("Request missing 'context' data.")
            return jsonify({"error": "Data Context Missing"}), 400

        # --- DIAGNOSTIC MODE: Lightweight Check ---
        if is_diagnostic:
            logger.info("Running Diagnostic Connectivity Check (Mode: Diagnostic)...")
            try:
                # Use a minimal prompt to verify API connection without heavy generation
                response = client.models.generate_content(
                    model='gemini-3-flash-preview',
                    contents="Return this exact JSON: {\"emailText\": \"Diagnostic OK\", \"htmlDashboard\": \"<div>OK</div>\"}",
                    config=types.GenerateContentConfig(
                        response_mime_type='application/json'
                    )
                )
                logger.info("Diagnostic check received response from Gemini.")
                result = json.loads(clean_json_text(response.text))
                return jsonify(result)
            except Exception as e:
                logger.error(f"Diagnostic Check Failed: {e}")
                return jsonify({"error": f"Diagnostic Probe Failed: {str(e)}"}), 500

        # --- NORMAL MODE: Full Report Generation ---
        logger.info("Starting Full Executive Report Synthesis...")

        prompt = f"""
        You are an expert Inventory Analyst. Analyze the following inventory risk data:
        
        {json.dumps(context, indent=2)}

        TASK:
        1. Write a professional Executive Summary email (emailText) to the Supply Chain Director.
        2. Create a clean, interactive HTML dashboard (htmlDashboard) using Tailwind CSS.
           - The dashboard should visualize the 'criticalItems' and 'summary' data provided.
        """

        response = client.models.generate_content(
            model='gemini-3-flash-preview',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type='application/json',
                response_schema={
                    'type': 'OBJECT',
                    'properties': {
                        'emailText': {'type': 'STRING'},
                        'htmlDashboard': {'type': 'STRING'}
                    },
                    'required': ['emailText', 'htmlDashboard']
                }
            )
        )

        try:
            # Attempt to parse
            cleaned_text = clean_json_text(response.text)
            if not cleaned_text:
                 logger.error("Gemini returned empty response text.")
                 raise ValueError("Empty response from AI Model")
                 
            result = json.loads(cleaned_text)
            logger.info("Synthesis successful. Returning JSON.")
            return jsonify(result)
        except (json.JSONDecodeError, ValueError) as je:
            logger.error(f"Response Parsing failed: {je}. Raw text: {response.text}")
            return jsonify({"error": "Failed to parse AI response. Please try again."}), 500

    except Exception as e:
        logger.error(f"AI Synthesis failed with unhandled exception: {str(e)}")
        # Check for specific Google API errors to provide better hints
        err_msg = str(e)
        if "403" in err_msg:
            return jsonify({"error": "API Key Invalid or Quota Exceeded"}), 500
        return jsonify({"error": f"Intelligence Failure: {err_msg}"}), 500

if __name__ == '__main__':
    print(f"-------------------------------------------------------")
    print(f" Inventory Agent Server v{SERVER_VERSION} Starting...")
    print(f" Routes: /api/health (GET), /api/analyze (POST)")
    print(f"-------------------------------------------------------")
    app.run(host='0.0.0.0', port=8080, debug=True)
