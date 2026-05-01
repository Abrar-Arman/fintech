"""
PricePilot Ai data model.

The schema is intentionally flexible: every PricingVariant stores its
model-specific fields inside a JSON column (`usage_inputs`) so we can
add new pricing models without writing migrations.
"""
from django.conf import settings
from django.db import models
from django.utils import timezone
from datetime import timedelta


PRICING_MODEL_CHOICES = [
    ("per_token", "Per Token"),
    ("per_seat", "Per Seat"),
    ("per_request", "Per Request"),
    ("flat_rate", "Flat Rate"),
    ("usage_based", "Usage Based"),
    ("tiered", "Tiered"),
]


SERVICE_CATEGORY_CHOICES = [
    ("llm", "LLM"),
    ("vector_db", "Vector DB"),
    ("hosting", "Hosting"),
    ("storage", "Storage"),
    ("payments", "Payments"),
    ("monitoring", "Monitoring"),
    ("communication", "Communication"),
    ("auth", "Auth"),
    ("other", "Other"),
]


class Service(models.Model):
    """A globally registered service freelancers can pick into a project."""

    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=140, unique=True)
    category = models.CharField(
        max_length=32, choices=SERVICE_CATEGORY_CHOICES, default="other"
    )
    description = models.TextField(blank=True)
    official_url = models.URLField(blank=True)
    is_official = models.BooleanField(default=False)
    icon_color = models.CharField(max_length=16, default="#22d3ee")

    # Community submission status: services proposed by users start as
    # "pending" and become "approved" once they collect enough votes.
    STATUS_CHOICES = [
        ("approved", "Approved"),
        ("pending", "Pending Community Vote"),
    ]
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default="approved")
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="submitted_services",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class PricingVariant(models.Model):
    """A community-contributed pricing model for a Service."""

    service = models.ForeignKey(
        Service, on_delete=models.CASCADE, related_name="variants"
    )
    label = models.CharField(max_length=140)
    model_type = models.CharField(max_length=32, choices=PRICING_MODEL_CHOICES)

    # The field shape depends on `model_type`. See api/pricing_models.py
    # for the canonical schema for each type.
    usage_inputs = models.JSONField(default=dict)

    is_official = models.BooleanField(default=False)
    notes = models.TextField(blank=True,null=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_variants",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_official", "-updated_at"]

    def __str__(self):
        return f"{self.service.name} — {self.label}"

    @property
    def upvotes(self) -> int:
        return self.votes.filter(value=1).count()

    @property
    def downvotes(self) -> int:
        return self.votes.filter(value=-1).count()

    @property
    def net_score(self) -> int:
        return self.upvotes - self.downvotes

    @property
    def is_outdated(self) -> bool:
        """A variant is "outdated" when it is older than 30 days OR has a
        negative net vote score. The frontend uses this flag to render
        the red warning badge."""
        if self.net_score < 0:
            return True
        return self.updated_at < timezone.now() - timedelta(days=30)


class Vote(models.Model):
    """A single user's vote on a PricingVariant. Users may flip their
    vote (the unique constraint guarantees one row per (user, variant))."""

    variant = models.ForeignKey(
        PricingVariant, on_delete=models.CASCADE, related_name="votes"
    )
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    VALUE_CHOICES = [(1, "Upvote"), (-1, "Downvote")]
    value = models.SmallIntegerField(choices=VALUE_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("variant", "user")


class Project(models.Model):
    """A user's AI-agent project that we are pricing."""

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="projects",null=True,
    blank=True,
    )
    name = models.CharField(max_length=140)
    description = models.TextField(blank=True)
    budget_target = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tech_stack = models.JSONField(default=list, blank=True)
    usage_inputs = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class ProjectService(models.Model):
    """Junction row linking a Project to a chosen Service + PricingVariant."""

    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="project_services"
    )
    service = models.ForeignKey(Service, on_delete=models.PROTECT)
    variant = models.ForeignKey(
        PricingVariant, null=True, blank=True, on_delete=models.SET_NULL
    )

    # If the user supplied their own pricing instead of picking a community
    # variant, store the custom pricing fields here.
    custom_inputs = models.JSONField(default=dict, blank=True)
    custom_model_type = models.CharField(
        max_length=32, choices=PRICING_MODEL_CHOICES, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("project", "service")
        ordering = ["created_at"]
