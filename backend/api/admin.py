from django.contrib import admin

from .models import PricingVariant, Project, ProjectService, Service, Vote


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "is_official", "status", "created_at")
    list_filter = ("category", "is_official", "status")
    search_fields = ("name", "description")


@admin.register(PricingVariant)
class PricingVariantAdmin(admin.ModelAdmin):
    list_display = ("service", "label", "model_type", "is_official", "updated_at")
    list_filter = ("model_type", "is_official")


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "budget_target", "created_at")


admin.site.register(ProjectService)
admin.site.register(Vote)
