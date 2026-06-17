import os
import re
import urllib.request
import urllib.error
import xml.etree.ElementTree as ET
from datetime import datetime
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache
cache = {
    "data": None,
    "last_fetched": None
}

def parse_updates_from_html(content_text):
    # Split content by <h3> tags
    parts = re.split(r'(<h3[^>]*>.*?</h3>)', content_text, flags=re.DOTALL | re.IGNORECASE)
    updates = []
    current_type = "Update"
    
    for part in parts:
        if not part.strip():
            continue
        if re.match(r'^<h3', part.strip(), re.IGNORECASE):
            match = re.search(r'<h3[^>]*>(.*?)</h3>', part, re.IGNORECASE | re.DOTALL)
            current_type = match.group(1).strip() if match else "Update"
        else:
            updates.append({
                "type": current_type,
                "body": part.strip()
            })
    return updates

def fetch_and_parse_feed():
    try:
        # Fetching with a User-Agent to avoid potential blockings (good practice)
        req = urllib.request.Request(
            FEED_URL, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'}
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_data = response.read()
            
        root = ET.fromstring(xml_data)
        ns = '{http://www.w3.org/2005/Atom}'
        entries = root.findall(f'{ns}entry')
        
        parsed_entries = []
        for entry in entries:
            entry_id = entry.find(f'{ns}id').text if entry.find(f'{ns}id') is not None else ''
            title = entry.find(f'{ns}title').text if entry.find(f'{ns}title') is not None else ''
            updated = entry.find(f'{ns}updated').text if entry.find(f'{ns}updated') is not None else ''
            content_elem = entry.find(f'{ns}content')
            content_text = content_elem.text if content_elem is not None else ''
            
            # Sub-updates within this entry
            sub_updates = parse_updates_from_html(content_text)
            
            for index, update in enumerate(sub_updates):
                # Generate unique ID for this update
                update_id = f"{entry_id}#update-{index}"
                parsed_entries.append({
                    "id": update_id,
                    "date": title,
                    "updated": updated,
                    "type": update["type"],
                    "body": update["body"]
                })
                
        return parsed_entries, None
    except urllib.error.URLError as e:
        return None, f"Network error fetching feed: {str(e.reason)}"
    except ET.ParseError as e:
        return None, f"XML Parsing error: {str(e)}"
    except Exception as e:
        return None, f"An unexpected error occurred: {str(e)}"

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/releases")
def get_releases():
    force_refresh = request.args.get("refresh", "false").lower() == "true"
    
    if force_refresh or cache["data"] is None or cache["last_fetched"] is None:
        data, error = fetch_and_parse_feed()
        if error:
            # If we have cached data, return it with warning instead of error
            if cache["data"] is not None:
                return jsonify({
                    "releases": cache["data"],
                    "error": f"Failed to refresh: {error}. Using cached data.",
                    "last_fetched": cache["last_fetched"].isoformat() if cache["last_fetched"] else None,
                    "cached": True
                }), 200
            return jsonify({"error": error}), 500
        
        cache["data"] = data
        cache["last_fetched"] = datetime.now()
        
    return jsonify({
        "releases": cache["data"],
        "last_fetched": cache["last_fetched"].isoformat(),
        "cached": False
    })

if __name__ == "__main__":
    # Allow port configuring or default to 5001
    port = int(os.environ.get("PORT", 5001))
    app.run(debug=True, host="0.0.0.0", port=port)
