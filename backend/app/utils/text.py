import re
import json
import html

def extract_text_content(content) -> str:
    if isinstance(content, str):
        return content.strip()
    elif isinstance(content, list):
        text_parts = []
        for part in content:
            if isinstance(part, dict) and "text" in part:
                text_parts.append(part["text"])
            elif isinstance(part, str):
                text_parts.append(part)
        return "".join(text_parts).strip()
    return str(content).strip()

def clean_html(html_content: str) -> str:
    # 1. Try to extract JobPosting from JSON-LD first (common in modern ATS like Phenom People)
    jd = ""
    json_ld_matches = re.finditer(r'<script\s+type=[\"\']application/ld\+json[\"\'][^>]*>([\s\S]*?)</script>', html_content, re.IGNORECASE)
    for match in json_ld_matches:
        try:
            data = json.loads(match.group(1).strip())
            if isinstance(data, dict):
                data = [data]
            for item in data:
                if item.get('@type') == 'JobPosting':
                    title = item.get('title', '')
                    description = item.get('description', '')
                    if description:
                        jd = f"{title}\n\n{description}"
                        break
        except Exception:
            continue
        if jd: break
        
    text_to_clean = jd if jd else html_content
    
    # Unescape HTML entities (e.g. &lt; to <)
    text_to_clean = html.unescape(text_to_clean)
    
    # Remove script and style elements
    text_to_clean = re.sub(r'<(script|style)\b[^>]*>([\s\S]*?)<\/\1>', ' ', text_to_clean, flags=re.IGNORECASE)
    
    # Preserve block elements and line breaks
    text_to_clean = re.sub(r'<br\s*/?>', '\n', text_to_clean, flags=re.IGNORECASE)
    text_to_clean = re.sub(r'</(p|div|h[1-6]|li)>', '\n', text_to_clean, flags=re.IGNORECASE)
    text_to_clean = re.sub(r'<li>', '• ', text_to_clean, flags=re.IGNORECASE)
    
    # Strip remaining HTML tags
    text_to_clean = re.sub(r'<[^>]+>', '', text_to_clean)
    
    # Clean up spaces but preserve newlines
    text_to_clean = re.sub(r'[ \t]+', ' ', text_to_clean)
    
    # Clean up excessive newlines
    text_to_clean = re.sub(r'\n\s*\n+', '\n\n', text_to_clean).strip()
    
    return text_to_clean
