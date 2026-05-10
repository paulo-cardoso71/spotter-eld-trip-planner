import uuid
from django.db import models


class TripPlan(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    # Inputs
    current_location_address = models.CharField(max_length=255)
    current_location_lat = models.FloatField()
    current_location_lng = models.FloatField()
    pickup_location_address = models.CharField(max_length=255)
    pickup_location_lat = models.FloatField()
    pickup_location_lng = models.FloatField()
    dropoff_location_address = models.CharField(max_length=255)
    dropoff_location_lat = models.FloatField()
    dropoff_location_lng = models.FloatField()
    current_cycle_used = models.FloatField()

    # Computed results
    total_distance_miles = models.FloatField(null=True)
    total_duration_hours = models.FloatField(null=True)
    fuel_cost_estimate = models.FloatField(null=True)
    route_geometry = models.JSONField(null=True)
    stops = models.JSONField(null=True)
    driving_segments = models.JSONField(null=True)
    daily_logs = models.JSONField(null=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Trip {self.id}: {self.current_location_address} -> {self.dropoff_location_address}"
