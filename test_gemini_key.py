#!/usr/bin/env python3
"""Quick test to verify Gemini API key works."""

import os
import sys

def get_gemini_api_key():
    """Get Gemini API key from env or apikey.txt."""
    key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if key and key.strip():
        return key.strip()
    try:
        root = os.path.dirname(os.path.abspath(__file__))
        path = os.path.join(root, "apikey.txt")
        if os.path.isfile(path):
            with open(path, "r") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#"):
                        return line.strip()
    except Exception:
        pass
    return None

def test_api_key():
    """Test if the API key works."""
    api_key = get_gemini_api_key()
    if not api_key:
        print("❌ ERROR: No API key found!")
        print("   Set GEMINI_API_KEY in environment or add key to apikey.txt")
        return False
    
    print(f"✓ Found API key: {api_key[:10]}...{api_key[-5:]}")
    
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.0-flash")
        
        print("✓ Testing API call...")
        resp = model.generate_content(
            "Say 'Hello' in JSON format: {\"message\": \"Hello\"}",
            generation_config={"response_mime_type": "application/json", "max_output_tokens": 50}
        )
        print(f"✓ API Response: {resp.text[:100]}")
        print("\n✅ SUCCESS: Your Gemini API key is working!")
        return True
        
    except ImportError:
        print("❌ ERROR: google-generativeai not installed")
        print("   Run: pip install google-generativeai")
        return False
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        if "API_KEY" in str(e) or "403" in str(e) or "401" in str(e):
            print("   Your API key may be invalid. Check it at: https://aistudio.google.com/app/apikey")
        return False

if __name__ == "__main__":
    success = test_api_key()
    sys.exit(0 if success else 1)
