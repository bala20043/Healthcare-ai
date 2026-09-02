import uuid
import re
from typing import Optional

def is_valid_uuid(val: str) -> bool:
    try:
        uuid.UUID(str(val))
        return True
    except (ValueError, AttributeError):
        return False

def sanitize_text(text: str) -> str:
    if not text:
        return ""
    # Strip dangerous hidden null characters or unprintable controls
    return "".join(ch for ch in text if ch.isprintable() or ch in ["\n", "\r", "\t"]).strip()

def normalize_query(text: str) -> str:
    """
    Normalize user query for keyword matching:
    - Lowercase & trim
    - Strip leading numbering like '1.', '2)', '[1]', 'a)'
    - Replace non-alphanumeric punctuation with space to ensure clean token matching
    """
    if not text:
        return ""
    cleaned = text.lower().strip()
    # Strip leading list numbering or bullet prefix
    cleaned = re.sub(r"^\s*([#\[\(]?\d+[\.\)]?|[a-z][\.\)])\s*", "", cleaned)
    # Replace punctuation with spaces
    cleaned = re.sub(r"[^\w\s]", " ", cleaned)
    return " ".join(cleaned.split())
