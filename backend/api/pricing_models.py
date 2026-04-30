"""
Definitions and human-readable explanations for each of the six
supported pricing models. We provide a flexible pricing-model system that defines how different billing
 strategies are described and used in a structured way. Instead of hardcoding forms or logic 
   each pricing type, each model is described using a schema that includes a list of input fields.
     Each field represents a specific value needed to calculate pricing, such as token costs,
     number of seats, requests, or usage units.
"""

PRICING_MODELS = [
    {
        "type": "per_token",
        "label": "Per Token",
        "description": (
            "You pay a fixed price for every 1,000 input/output tokens. "
            "Used by most LLM providers (OpenAI, Anthropic, Google)."
        ),
        "when_to_use": (
            "Pick this when the service is an LLM API and pricing scales "
            "with the size of the prompt and the response."
        ),
        "fields": [
            {"name": "input_price_per_1k", "type": "decimal", "required": True,
             "help": "USD charged per 1,000 input tokens."},
            {"name": "output_price_per_1k", "type": "decimal", "required": True,
             "help": "USD charged per 1,000 output tokens."},
            {"name": "context_window", "type": "integer", "required": False,
             "help": "Maximum tokens per request (informational)."},
        ],
        "example": {
            "price_per_1k_input_tokens": 2.50,
            "price_per_1k_output_tokens": 10.00,
            "context_window": 128000,
        },
    },
    {
        "type": "per_seat",
        "label": "Per Seat",
        "description": (
            "Flat monthly price for each user account / developer seat."
        ),
        "when_to_use": (
            "Pick this for SaaS tools where every active human user counts "
            "(monitoring dashboards, design tools, project trackers)."
        ),
        "fields": [
            {"name": "price_per_seat_monthly", "type": "decimal", "required": True,
             "help": "USD per seat per month."},
            {"name": "min_seats", "type": "integer", "required": False, "help": "Minimum billable seats."},
            {"name": "included_seats", "type": "integer", "required": False,
             "help": "Seats included in the base plan."},
        ],
        "example": {"price_per_seat_monthly": 23.00, "min_seats": 1, "included_seats": 0},
    },
    {
        "type": "per_request",
        "label": "Per Request",
        "description": (
            "Charged per individual API call, regardless of payload size."
        ),
        "when_to_use": (
            "Pick this for unit-priced APIs like SMS, email send, "
            "geocoding, image generation, or webhook delivery."
        ),
        "fields": [
            {"name": "price_per_request", "type": "decimal", "required": True,
             "help": "USD per single request."},
            {"name": "included_requests_monthly", "type": "integer", "required": False,
             "help": "Free requests included per month before billing kicks in."},
        ],
        "example": {"price_per_request": 0.0079, "included_requests_monthly": 100},
    },
    {
        "type": "flat_rate",
        "label": "Flat Rate",
        "description": (
            "A single recurring monthly (or annual) fee, regardless of usage."
        ),
        "when_to_use": (
            "Pick this for fixed-tier subscriptions like a Pinecone starter plan, "
            "a Datadog Pro license, or a managed Postgres tier."
        ),
        "fields": [
            {"name": "monthly_fee", "type": "decimal", "required": True, "help": "USD per month."},
            {"name": "billing_cycle", "type": "enum", "required": True,
             "options": ["monthly", "yearly"]},
            {"name": "included_features", "type": "string", "required": False,
             "help": "Short note describing what is bundled."},
        ],
        "example": {"monthly_fee": 70.00, "billing_cycle": "monthly",
                    "included_features": "5M vector reads, 1 index"},
    },
    {
        "type": "usage_based",
        "label": "Usage Based",
        "description": (
            "Pay per unit of consumption — GB stored, GB transferred, "
            "compute-hours, vector reads, function invocations."
        ),
        "when_to_use": (
            "Pick this for storage, bandwidth, edge compute, function "
            "platforms, and serverless databases."
        ),
        "fields": [
            {"name": "unit_name", "type": "string", "required": True,
             "help": "Human-readable unit, e.g. 'GB', 'GB-month', 'compute-hour'."},
            {"name": "price_per_unit", "type": "decimal", "required": True,
             "help": "USD per unit."},
            {"name": "free_tier_units", "type": "decimal", "required": False,
             "help": "Free units included before billing begins."},
            {"name": "metric", "type": "enum", "required": True,
             "options": ["storage_gb", "bandwidth_gb", "compute_hours", "requests"],
             "help": "Which usage metric this rate applies to."},
        ],
        "example": {"unit_name": "GB-month", "price_per_unit": 0.023,
                    "free_tier_units": 5, "metric": "storage_gb"},
    },
    {
        "type": "tiered",
        "label": "Tiered",
        "description": (
            "Volume tiers — the unit price drops as usage crosses each "
            "threshold. Common for messaging, payments, and CDN bandwidth."
        ),
        "when_to_use": (
            "Pick this when the provider publishes a 'first 1M free, then "
            "$X/M, then $Y/M' style price card."
        ),
        "fields": [
            {"name": "metric", "type": "enum", "required": True,
             "options": ["requests", "storage_gb", "bandwidth_gb", "compute_hours"]},
            {"name": "tiers", "type": "array", "required": True,
             "help": ("Ordered list of {threshold, price_per_unit}. The "
                      "threshold is the upper bound (use null for the final "
                      "open-ended tier).")},
        ],
        "example": {
            "metric": "requests",
            "tiers": [
                {"threshold": 1_000_000, "price_per_unit": 0.0},
                {"threshold": 10_000_000, "price_per_unit": 0.40},
                {"threshold": None, "price_per_unit": 0.30},
            ],
        },
    },
]


PRICING_MODELS_BY_TYPE = {m["type"]: m for m in PRICING_MODELS}
