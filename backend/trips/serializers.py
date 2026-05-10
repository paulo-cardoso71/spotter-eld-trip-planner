from rest_framework import serializers


class LocationSerializer(serializers.Serializer):
    address = serializers.CharField(max_length=255)
    lat = serializers.FloatField(min_value=-90, max_value=90)
    lng = serializers.FloatField(min_value=-180, max_value=180)


class TripPlanRequestSerializer(serializers.Serializer):
    current_location = LocationSerializer()
    pickup_location = LocationSerializer()
    dropoff_location = LocationSerializer()
    current_cycle_used = serializers.FloatField(min_value=0, max_value=70)


class TripPlanResponseSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    created_at = serializers.DateTimeField()
    total_distance_miles = serializers.FloatField()
    total_duration_hours = serializers.FloatField()
    fuel_cost_estimate = serializers.FloatField()
    number_of_stops = serializers.IntegerField()
    number_of_log_days = serializers.IntegerField()
    route = serializers.DictField()
    stops = serializers.ListField()
    driving_segments = serializers.ListField()
    daily_logs = serializers.ListField()
