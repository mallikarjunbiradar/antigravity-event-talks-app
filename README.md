# BigQuery Release Notes Dashboard & Social Sharing App

A web application built using Python Flask, vanilla HTML5, JavaScript, and CSS3 that fetches Google BigQuery's official release notes RSS feed, separates updates into interactive classification cards, and enables single-click composing and posting on X (Twitter).

---

## Features

1. **Granular Release Splitting**: Dynamically parses the BigQuery feed, splitting entries grouped by date into individual updates based on type.
2. **Category Classifications**: Color-coded badges categorizing releases:
   * 🟢 **Feature**: New feature enhancements.
   * 🟣 **Announcement**: General product news and upcoming changes.
   * 🔴 **Issue**: Bug warnings or temporary downtime notices.
   * 🔵 **Change**: Modifications to API behaviors or structures.
3. **In-Memory Caching**: Optimizes page load speeds and API performance, with an option to force a network refresh by clicking the **Refresh** button.
4. **Fuzzy Search & Filters**: Live, instantaneous searching by keyword across dates, types, or bodies.
5. **Interactive Twitter Modal**: A custom compositing modal that includes three pre-formatted styling templates (*Brief*, *Hype*, *Technical*), checks for character limit rules, and links to Twitter Web Intent.
6. **Glassmorphic Dark Theme**: Premium styling featuring background glow blobs, semi-transparent overlays, and custom loading animations.

---

## File Structure

* [app.py](file:///Users/mallikajunbiradar/Desktop/AI_kaggle/agy-cli-projects/bq-releases-notes/app.py) - Flask backend that manages feed fetching, parsing, and caching.
* [templates/index.html](file:///Users/mallikajunbiradar/Desktop/AI_kaggle/agy-cli-projects/bq-releases-notes/templates/index.html) - Structural layout containing search inputs, classification filter pills, card nodes, and composing modals.
* [static/css/styles.css](file:///Users/mallikajunbiradar/Desktop/AI_kaggle/agy-cli-projects/bq-releases-notes/static/css/styles.css) - Premium styling containing variables, glassmorphic filters, and animated loader rings.
* [static/js/app.js](file:///Users/mallikajunbiradar/Desktop/AI_kaggle/agy-cli-projects/bq-releases-notes/static/js/app.js) - App controller governing states, filtering, search keywords matching, and tweet composing logic.
* [requirements.txt](file:///Users/mallikajunbiradar/Desktop/AI_kaggle/agy-cli-projects/bq-releases-notes/requirements.txt) - Dependency metadata listing `flask`.
* [.gitignore](file:///Users/mallikajunbiradar/Desktop/AI_kaggle/agy-cli-projects/bq-releases-notes/.gitignore) - Rules to prevent pushing virtual environment cache and system logs.

---

## Local Setup Guide

### Prerequisites
* Python 3.10 or higher.

### 1. Set Up Environment
Navigate to the project folder, create a virtual environment, and install dependencies:
```bash
cd /Users/mallikajunbiradar/Desktop/AI_kaggle/agy-cli-projects/bq-releases-notes
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Run the Server
Launch the Flask development server:
```bash
python app.py
```

### 3. Open the App
Navigate to:
👉 **[http://localhost:5001](http://localhost:5001)**

---

## Technical Details

### Feed Splitting & Parser (Flask)
Google's release note XML lists items grouped by date within a single `<content>` node:
```html
<h3>Feature</h3>
<p>Description of feature...</p>
<h3>Issue</h3>
<p>Description of issue...</p>
```
The server in [app.py](file:///Users/mallikajunbiradar/Desktop/AI_kaggle/agy-cli-projects/bq-releases-notes/app.py) parses this content text using regular expression capture filters:
```python
re.split(r'(<h3[^>]*>.*?</h3>)', content_text)
```
This isolates the classifications and separates the paragraphs into discrete update card dictionaries before returning them to the client as JSON objects.

### Social Sharing Intent (JavaScript)
The app uses Twitter's Web Intent parameters:
`https://twitter.com/intent/tweet?text=ENCODED_STRING`
The client in [app.js](file:///Users/mallikajunbiradar/Desktop/AI_kaggle/agy-cli-projects/bq-releases-notes/static/js/app.js) strips HTML characters, truncates the message according to the selected template style (Brief, Hype, or Technical), monitors the 280-character maximum, and launches a secure new browser window to execute the posting.
