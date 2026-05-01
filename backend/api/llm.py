"""
LLM-powered service suggestion.

Given a project's name, description, and tech stack, ask Claude for the
list of paid services the system will likely depend on. Each suggestion
is then run through the fuzzy matcher so the response is always
grounded in our services table.

If ANTHROPIC_API_KEY is not set the function falls back to a
deterministic keyword-based heuristic — useful for offline demos.
"""
import json
import re
from typing import Iterable

from django.conf import settings

from .fuzzy import fuzzy_match


PROMPT_TEMPLATE = """You are PricePilot Ai, a financial estimator for AI agent systems.

A freelancer is pricing this project:

NAME: {name}
DESCRIPTION: {description}
TECH STACK: {tech_stack}

List the paid third-party services this project will most likely depend
on at runtime (LLM APIs, vector databases, hosting platforms, storage,
auth, payments, monitoring, communication). Only include services that
have a real billing model — do NOT include open-source libraries.

Respond ONLY with JSON of the exact shape:

{{
  "services": [
    {{ "name": "<service name>", "category": "<llm|vector_db|hosting|storage|payments|monitoring|communication|auth|other>", "reason": "<one short sentence>" }}
  ]
}}

Aim for 4-8 suggestions. Use widely-recognised brand names (e.g.
"OpenAI GPT-4o", "Anthropic Claude Sonnet", "Pinecone", "Vercel",
"Stripe").""".strip()


def suggest_services(name: str, description: str, tech_stack: Iterable[str]) -> dict:
    """Return matched services + raw LLM suggestions + unresolved names."""
    raw_suggestions = _call_llm(name, description, list(tech_stack or []))

    matched = []
    suggestions = []
    unmatched = []
    seen_ids = set()
    for item in raw_suggestions:
        result = fuzzy_match(item["name"])
        if result["matched"] and result["matched"]["service_id"] not in seen_ids:
            seen_ids.add(result["matched"]["service_id"])
            matched.append({
                **result["matched"],
                "reason": item.get("reason", ""),
            })
        elif result["suggestions"]:
            suggestions.append({
                "query": item["name"],
                "category": item.get("category", "other"),
                "reason": item.get("reason", ""),
                "options": result["suggestions"][:3],
            })
        else:
            unmatched.append({
                "name": item["name"],
                "category": item.get("category", "other"),
                "reason": item.get("reason", ""),
            })

    return {
        "matched": matched,
        "suggestions": suggestions,
        "unmatched": unmatched,
        "source": "anthropic" if settings.ANTHROPIC_API_KEY else "heuristic",
    }


def _call_llm(name: str, description: str, tech_stack: list) -> list:
    api_key = settings.ANTHROPIC_API_KEY
    if not api_key:
        return _heuristic_suggestions(name, description, tech_stack)

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            messages=[{
                "role": "user",
                "content": PROMPT_TEMPLATE.format(
                    name=name or "Untitled",
                    description=description or "(no description)",
                    tech_stack=", ".join(tech_stack) or "(unspecified)",
                ),
            }],
        )
        text = "".join(
            block.text for block in message.content if hasattr(block, "text")
        )
        payload = _parse_json_block(text)
        return payload.get("services", []) if isinstance(payload, dict) else []
    except Exception:
        # Never let an LLM outage block the flow — fall back gracefully.
        return _heuristic_suggestions(name, description, tech_stack)


def _parse_json_block(text: str) -> dict:
    """Anthropic sometimes wraps JSON in ```json fences. Strip them."""
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    candidate = fenced.group(1) if fenced else text.strip()
    try:
        return json.loads(candidate)
    except json.JSONDecodeError:
        # Last-ditch attempt: find the first {...} block.
        match = re.search(r"\{.*\}", candidate, re.DOTALL)
        if not match:
            return {}
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            return {}


# ---- Heuristic fallback ----------------------------------------------------

KEYWORDS = {
    "openai": ("OpenAI GPT-4o", "llm"),
    "gpt": ("OpenAI GPT-4o", "llm"),
    "claude": ("Anthropic Claude Sonnet", "llm"),
    "anthropic": ("Anthropic Claude Sonnet", "llm"),
    "gemini": ("Google Gemini", "llm"),
    "pinecone": ("Pinecone", "vector_db"),
    "weaviate": ("Weaviate", "vector_db"),
    "vector": ("Pinecone", "vector_db"),
    "embedding": ("Pinecone", "vector_db"),
    "vercel": ("Vercel", "hosting"),
    "next": ("Vercel", "hosting"),
    "lambda": ("AWS Lambda", "hosting"),
    "cloudflare": ("Cloudflare Workers", "hosting"),
    "supabase": ("Supabase", "storage"),
    "postgres": ("Supabase", "storage"),
    "stripe": ("Stripe", "payments"),
    "payment": ("Stripe", "payments"),
    "twilio": ("Twilio", "communication"),
    "sms": ("Twilio", "communication"),
    "sendgrid": ("SendGrid", "communication"),
    "email": ("SendGrid", "communication"),
    "datadog": ("Datadog", "monitoring"),
    "monitor": ("Datadog", "monitoring"),
}


def _heuristic_suggestions(name: str, description: str, tech_stack: list) -> list:
    """Cheap keyword scan over the project text. Always returns something
    plausible so the demo never falls back to an empty state."""
    text = " ".join([name or "", description or "", *tech_stack]).lower()
    found = {}
    for keyword, (svc, category) in KEYWORDS.items():
        if keyword in text and svc not in found:
            found[svc] = {
                "name": svc,
                "category": category,
                "reason": f"Matched keyword '{keyword}' in your project description.",
            }

    if not found:
        # Sensible defaults for a generic AI agent project.
        for svc, category in [
            ("OpenAI GPT-4o", "llm"),
            ("Pinecone", "vector_db"),
            ("Vercel", "hosting"),
            ("Supabase", "storage"),
            ("Stripe", "payments"),
        ]:
            found[svc] = {
                "name": svc,
                "category": category,
                "reason": "Common dependency for AI agent systems.",
            }

    return list(found.values())
