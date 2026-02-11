
import os
import re
import json
import logging
from flask import Flask, request, jsonify, send_from_directory
from google import genai
from flask_cors import CORS

app = Flask(__name__, static_folder='.', static_url_path='')

# Enable CORS for all routes so the frontend can talk to the backend
CORS(app)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Security: Access Token for the app
ACCESS_TOKEN = os.environ.get("ACCESS_TOKEN", "123456")

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "online", "secure": True})

@app.route('/api/verify', methods=['POST'])
def verify():
    data = request.json
    if str(data.get('token')) == str(ACCESS_TOKEN):
        return jsonify({"valid": True})
    return jsonify({"valid": False}), 401

@app.route('/api/analyze', methods=['POST'])
def analyze():
    # Verify token on every sensitive request
    token = request.headers.get('Authorization')
    if token != ACCESS_TOKEN:
        return jsonify({"error": "Unauthorized"}), 401

    try:
        api_key = os.environ.get("API_KEY")
        client = genai.Client(api_key=api_key)
        
        data = request.json
        context = data.get('context')

        prompt = f"""
        You are a World-Class Supply Chain Strategy Consultant.
        Analyze this inventory data context:
        {context}

        Deliver:
        1. Professional Executive Email Summary.
        2. Interactive HTML/Tailwind/Chart.js dashboard inside a ```html block.
        """

        response = client.models.generate_content(
            model='gemini-2.0-flash',
            contents=prompt
        )

        full_text = response.text or ""
        html_match = re.search(r'```html([\s\S]*?)```', full_text)
        html_dashboard = html_match.group(1).strip() if html_match else ""
        email_text = re.sub(r'```html[\s\S]*?```', '', full_text).strip()

        return jsonify({
            "emailText": email_text,
            "htmlDashboard": html_dashboard
        })

    except Exception as e:
        logger.error(f"Analysis failed: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)
