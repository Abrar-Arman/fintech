"""
Fuzzy matching gate.

Step 3 of the pricing flow ("Fuzzy check — mandatory gate") in the
project flow diagram. Every service name a user enters or that the LLM
suggests has to pass through this function before we add it to a
project. Returns either a confident match or a "did you mean" list.
"""
from rapidfuzz import process, fuzz
from .models import Service


# Anything at or above this score is treated as a confident match.
MATCH_THRESHOLD = 80
# Anything at or above this is shown as a "did you mean" suggestion.
SUGGEST_THRESHOLD = 55


def fuzzy_match(query: str, limit: int = 5) -> dict:
    """Compare `query` against every approved service name."""
    query = (query or "").strip()
    if not query:
        return {"query": "", "matched": None, "suggestions": []}

    services = list(Service.objects.filter(status="approved"))
    if not services:
        return {"query": query, "matched": None, "suggestions": []}

    choices = {s.id: s.name for s in services}
    results = process.extract(
        query,
        choices,
        scorer=fuzz.WRatio,
        limit=limit,
    )

    matched = None
    suggestions = []
    for name, score, service_id in results:
        service = next((s for s in services if s.id == service_id), None)
        if service is None:
            continue
        entry = {
            "service_id": service.id,
            "name": service.name,
            "category": service.category,
            "icon_color": service.icon_color,
            "score": round(float(score), 1),
        }
        if matched is None and score >= MATCH_THRESHOLD:
            matched = entry
        elif score >= SUGGEST_THRESHOLD:
            suggestions.append(entry)

    return {
        "query": query,
        "matched": matched,
        "suggestions": suggestions,
        "match_threshold": MATCH_THRESHOLD,
    }
