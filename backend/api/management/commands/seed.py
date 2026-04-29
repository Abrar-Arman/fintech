"""
Seed the database with the same set of services + pricing variants the
React frontend ships with as mock data, so a freshly migrated install
is immediately usable for the demo.
"""
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify

from api.models import PricingVariant, Service


User = get_user_model()


SERVICES = [
    {
        "name": "OpenAI GPT-4o", "category": "llm", "icon_color": "#10a37f",
        "description": "Flagship multimodal model from OpenAI.",
        "official_url": "https://openai.com/api/pricing/",
        "variants": [
            {
                "label": "Official April 2026", "model_type": "per_token",
                "is_official": True,
                "usage_inputs": {
                    "price_per_1k_input_tokens": 2.50,
                    "price_per_1k_output_tokens": 10.00,
                    "context_window": 128000,
                },
            },
        ],
    },
    {
        "name": "Anthropic Claude Sonnet", "category": "llm", "icon_color": "#cc785c",
        "description": "Balanced Claude tier — strong reasoning at low latency.",
        "official_url": "https://www.anthropic.com/pricing",
        "variants": [
            {
                "label": "Claude 3.5 Sonnet", "model_type": "per_token",
                "is_official": True,
                "usage_inputs": {
                    "price_per_1k_input_tokens": 3.00,
                    "price_per_1k_output_tokens": 15.00,
                    "context_window": 200000,
                },
            },
        ],
    },
    {
        "name": "Google Gemini", "category": "llm", "icon_color": "#4285f4",
        "description": "Google's multimodal LLM family.",
        "official_url": "https://ai.google.dev/pricing",
        "variants": [
            {
                "label": "Gemini 2.0 Flash", "model_type": "per_token",
                "is_official": True,
                "usage_inputs": {
                    "price_per_1k_input_tokens": 0.10,
                    "price_per_1k_output_tokens": 0.40,
                    "context_window": 1000000,
                },
            },
        ],
    },
    {
        "name": "Pinecone", "category": "vector_db", "icon_color": "#1d4ed8",
        "description": "Managed vector database for retrieval-augmented systems.",
        "official_url": "https://www.pinecone.io/pricing/",
        "variants": [
            {
                "label": "Standard plan", "model_type": "flat_rate", "is_official": True,
                "usage_inputs": {"monthly_fee": 70.00, "billing_cycle": "monthly",
                                  "included_features": "5M vector reads, 1 index"},
            },
        ],
    },
    {
        "name": "Weaviate", "category": "vector_db", "icon_color": "#22c55e",
        "description": "Open-source vector database with managed cloud tier.",
        "official_url": "https://weaviate.io/pricing",
        "variants": [
            {
                "label": "Serverless cloud", "model_type": "usage_based", "is_official": True,
                "usage_inputs": {"unit_name": "1M vectors stored",
                                  "price_per_unit": 25.00, "free_tier_units": 0,
                                  "metric": "storage_gb"},
            },
        ],
    },
    {
        "name": "Vercel", "category": "hosting", "icon_color": "#000000",
        "description": "Edge hosting platform popular for Next.js frontends.",
        "official_url": "https://vercel.com/pricing",
        "variants": [
            {
                "label": "Pro plan", "model_type": "per_seat", "is_official": True,
                "usage_inputs": {"price_per_seat_monthly": 20.00,
                                  "min_seats": 1, "included_seats": 0},
            },
        ],
    },
    {
        "name": "Cloudflare Workers", "category": "hosting", "icon_color": "#f6821f",
        "description": "Edge functions priced per million requests.",
        "official_url": "https://developers.cloudflare.com/workers/platform/pricing/",
        "variants": [
            {
                "label": "Paid tier", "model_type": "tiered", "is_official": True,
                "usage_inputs": {
                    "metric": "requests",
                    "tiers": [
                        {"threshold": 10_000_000, "price_per_unit": 0.0},
                        {"threshold": None, "price_per_unit": 0.30 / 1_000_000},
                    ],
                },
            },
        ],
    },
    {
        "name": "AWS Lambda", "category": "hosting", "icon_color": "#ff9900",
        "description": "Serverless functions billed by request and compute time.",
        "official_url": "https://aws.amazon.com/lambda/pricing/",
        "variants": [
            {
                "label": "Standard request pricing", "model_type": "per_request",
                "is_official": True,
                "usage_inputs": {"price_per_request": 0.0000002,
                                  "included_requests_monthly": 1_000_000},
            },
        ],
    },
    {
        "name": "Supabase", "category": "storage", "icon_color": "#3ecf8e",
        "description": "Managed Postgres + auth + storage.",
        "official_url": "https://supabase.com/pricing",
        "variants": [
            {
                "label": "Pro plan", "model_type": "flat_rate", "is_official": True,
                "usage_inputs": {"monthly_fee": 25.00, "billing_cycle": "monthly",
                                  "included_features": "8GB DB, 100GB bandwidth"},
            },
        ],
    },
    {
        "name": "Stripe", "category": "payments", "icon_color": "#635bff",
        "description": "Online payments and billing.",
        "official_url": "https://stripe.com/pricing",
        "variants": [
            {
                "label": "Standard processing", "model_type": "per_request",
                "is_official": True,
                "usage_inputs": {"price_per_request": 0.30,
                                  "included_requests_monthly": 0},
                "notes": "Plus 2.9% of transaction value (not modeled here).",
            },
        ],
    },
    {
        "name": "Twilio", "category": "communication", "icon_color": "#f22f46",
        "description": "Programmatic SMS, voice, and WhatsApp.",
        "official_url": "https://www.twilio.com/en-us/pricing",
        "variants": [
            {
                "label": "US SMS outbound", "model_type": "per_request",
                "is_official": True,
                "usage_inputs": {"price_per_request": 0.0079,
                                  "included_requests_monthly": 0},
            },
        ],
    },
    {
        "name": "SendGrid", "category": "communication", "icon_color": "#1a82e2",
        "description": "Transactional email at scale.",
        "official_url": "https://sendgrid.com/en-us/pricing",
        "variants": [
            {
                "label": "Essentials", "model_type": "tiered", "is_official": True,
                "usage_inputs": {
                    "metric": "requests",
                    "tiers": [
                        {"threshold": 50_000, "price_per_unit": 0.0},
                        {"threshold": 100_000, "price_per_unit": 19.95 / 50_000},
                        {"threshold": None, "price_per_unit": 0.00085},
                    ],
                },
            },
        ],
    },
    {
        "name": "Datadog", "category": "monitoring", "icon_color": "#632ca6",
        "description": "Infrastructure and APM monitoring.",
        "official_url": "https://www.datadoghq.com/pricing/",
        "variants": [
            {
                "label": "Pro per host", "model_type": "per_seat", "is_official": True,
                "usage_inputs": {"price_per_seat_monthly": 23.00,
                                  "min_seats": 1, "included_seats": 0},
            },
        ],
    },
]


class Command(BaseCommand):
    help = "Seed CostForge services + pricing variants."

    @transaction.atomic
    def handle(self, *args, **options):
        # Demo user for the no-login frontend bootstrap. Always reset the
        # password so the deterministic credentials in src/lib/api.ts work
        # after any DB reset.
        demo_user, _ = User.objects.get_or_create(
            username="demo",
            defaults={"email": "demo@costforge.dev"},
        )
        demo_user.set_password("costforge-demo-2026")
        demo_user.save()

        created_services = 0
        created_variants = 0
        for entry in SERVICES:
            service, was_created = Service.objects.update_or_create(
                slug=slugify(entry["name"])[:140],
                defaults={
                    "name": entry["name"],
                    "category": entry["category"],
                    "description": entry.get("description", ""),
                    "official_url": entry.get("official_url", ""),
                    "icon_color": entry.get("icon_color", "#22d3ee"),
                    "is_official": True,
                    "status": "approved",
                },
            )
            if was_created:
                created_services += 1
            for v in entry.get("variants", []):
                _variant, v_created = PricingVariant.objects.update_or_create(
                    service=service,
                    label=v["label"],
                    defaults={
                        "model_type": v["model_type"],
                        "usage_inputs": v["usage_inputs"],
                        "is_official": v.get("is_official", False),
                        "notes": v.get("notes", ""),
                    },
                )
                if v_created:
                    created_variants += 1
        self.stdout.write(self.style.SUCCESS(
            f"Seed complete. Services created: {created_services}, "
            f"variants created: {created_variants}."
        ))
