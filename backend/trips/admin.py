from django.contrib import admin
from .models import TripPlan

@admin.register(TripPlan)
class TripPlanAdmin(admin.ModelAdmin):
    list_display = ['id', 'current_location_address', 'dropoff_location_address', 'created_at']
    readonly_fields = ['id', 'created_at']
