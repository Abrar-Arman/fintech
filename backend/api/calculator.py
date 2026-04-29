"""
Cost calculation engine.

Given a Project (and the user's usage inputs), produce a per-service
cost breakdown plus three risk scenarios (Conservative / Expected /
Aggressive). The math intentionally lives on the server so the frontend
can be fully replaced without losing the source of truth.
"""
from decimal import Decimal
from typing import Any


def _as_decimal(value: Any, default: str = "0") -> Decimal:
    if value is None or value == "":
        return Decimal(default)
    try:
        return Decimal(str(value))
    except Exception:
        return Decimal(default)


def calculate_variant_cost(
    model_type: str,
    fields: dict,
    usage: dict,
) -> Decimal:
    """Return the monthly cost (USD) of a single service given its
    pricing fields and the project's usage inputs."""

    active_users = _as_decimal(usage.get("active_users", 0))
    tokens_per_request = _as_decimal(usage.get("tokens_per_request", 0))
    requests_per_user = _as_decimal(usage.get("requests_per_user", 0))
    storage_gb = _as_decimal(usage.get("storage_gb", 0))
    bandwidth_gb = _as_decimal(usage.get("bandwidth_gb", 0))
    compute_hours = _as_decimal(usage.get("compute_hours", 0))

    total_requests = active_users * requests_per_user
    total_tokens = total_requests * tokens_per_request

    if model_type == "per_token":
        # Assume a 1:1 input:output ratio for the demo. Real apps should
        # let users override the ratio.
        in_rate = _as_decimal(fields.get("price_per_1k_input_tokens"))
        out_rate = _as_decimal(fields.get("price_per_1k_output_tokens"))
        avg_rate = (in_rate + out_rate) / Decimal(2)
        return (total_tokens / Decimal(1000)) * avg_rate

    if model_type == "per_seat":
        per_seat = _as_decimal(fields.get("price_per_seat_monthly"))
        min_seats = _as_decimal(fields.get("min_seats", 0))
        included = _as_decimal(fields.get("included_seats", 0))
        billable = max(active_users - included, min_seats)
        return billable * per_seat

    if model_type == "per_request":
        per_req = _as_decimal(fields.get("price_per_request"))
        included = _as_decimal(fields.get("included_requests_monthly", 0))
        billable = max(total_requests - included, Decimal(0))
        return billable * per_req

    if model_type == "flat_rate":
        fee = _as_decimal(fields.get("monthly_fee"))
        if fields.get("billing_cycle") == "yearly":
            return fee / Decimal(12)
        return fee

    if model_type == "usage_based":
        metric = fields.get("metric", "storage_gb")
        unit_price = _as_decimal(fields.get("price_per_unit"))
        free_units = _as_decimal(fields.get("free_tier_units", 0))
        units = {
            "storage_gb": storage_gb,
            "bandwidth_gb": bandwidth_gb,
            "compute_hours": compute_hours,
            "requests": total_requests,
        }.get(metric, Decimal(0))
        billable = max(units - free_units, Decimal(0))
        return billable * unit_price

    if model_type == "tiered":
        metric = fields.get("metric", "requests")
        units = {
            "storage_gb": storage_gb,
            "bandwidth_gb": bandwidth_gb,
            "compute_hours": compute_hours,
            "requests": total_requests,
        }.get(metric, Decimal(0))
        return _tiered_cost(units, fields.get("tiers", []))

    return Decimal(0)


def _tiered_cost(units: Decimal, tiers: list) -> Decimal:
    """Walk the tier table, charging each band at its own rate."""
    cost = Decimal(0)
    consumed = Decimal(0)
    for tier in tiers:
        threshold = tier.get("threshold")
        price = _as_decimal(tier.get("price_per_unit"))
        if threshold is None:
            band = max(units - consumed, Decimal(0))
            cost += band * price
            return cost
        band_top = _as_decimal(threshold)
        band = max(min(units, band_top) - consumed, Decimal(0))
        cost += band * price
        consumed = band_top
        if units <= consumed:
            return cost
    return cost


def _scale_usage(usage: dict, factor: float) -> dict:
    scaled = dict(usage)
    for key in ("active_users", "requests_per_user", "tokens_per_request",
                "storage_gb", "bandwidth_gb", "compute_hours"):
        if key in scaled:
            scaled[key] = float(_as_decimal(scaled[key])) * factor
    return scaled


def calculate_project(project, usage: dict) -> dict:
    """Return per-service breakdown + totals + 3 budget scenarios."""
    breakdown = []
    total = Decimal(0)
    for ps in project.project_services.select_related("service", "variant").all():
        if ps.variant:
            model_type = ps.variant.model_type
            fields = ps.variant.usage_inputs
            variant_label = ps.variant.label
        else:
            model_type = ps.custom_model_type or "flat_rate"
            fields = ps.custom_inputs or {}
            variant_label = "Custom"
        cost = calculate_variant_cost(model_type, fields, usage)
        total += cost
        breakdown.append({
            "service_id": ps.service_id,
            "service_name": ps.service.name,
            "category": ps.service.category,
            "variant_label": variant_label,
            "model_type": model_type,
            "monthly_cost": float(round(cost, 2)),
        })

    # Three risk scenarios so the user can see headroom.
    def _scenario(factor: float) -> Decimal:
        scenario_total = Decimal(0)
        scaled = _scale_usage(usage, factor)
        for ps in project.project_services.select_related("variant").all():
            if ps.variant:
                model_type = ps.variant.model_type
                fields = ps.variant.usage_inputs
            else:
                model_type = ps.custom_model_type or "flat_rate"
                fields = ps.custom_inputs or {}
            scenario_total += calculate_variant_cost(model_type, fields, scaled)
        return scenario_total

    conservative = _scenario(0.5)
    expected = total
    aggressive = _scenario(2.0)

    budget = _as_decimal(project.budget_target)
    headroom = budget - expected
    headroom_pct = float((expected / budget) * 100) if budget > 0 else 0.0

    return {
        "total_monthly_cost": float(round(total, 2)),
        "budget_target": float(round(budget, 2)),
        "headroom_usd": float(round(headroom, 2)),
        "budget_used_pct": round(headroom_pct, 1),
        "breakdown": breakdown,
        "scenarios": {
            "conservative": {"factor": 0.5, "monthly_cost": float(round(conservative, 2))},
            "expected":     {"factor": 1.0, "monthly_cost": float(round(expected, 2))},
            "aggressive":   {"factor": 2.0, "monthly_cost": float(round(aggressive, 2))},
        },
    }
