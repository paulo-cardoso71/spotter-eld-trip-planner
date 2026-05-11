from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import TripPlan
from .serializers import TripPlanRequestSerializer
from .services.route_service import fetch_route, reverse_geocode
from .services.hos_engine import calculate_trip, Location
from .services.log_generator import generate_daily_logs


class TripPlanCreateView(APIView):
    def post(self, request):
        serializer = TripPlanRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'error': 'validation_error', 'details': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = serializer.validated_data
        current = data['current_location']
        pickup = data['pickup_location']
        dropoff = data['dropoff_location']
        cycle_used = data['current_cycle_used']

        try:
            route = fetch_route(
                {'lat': current['lat'], 'lng': current['lng'], 'address': current['address']},
                {'lat': pickup['lat'], 'lng': pickup['lng'], 'address': pickup['address']},
                {'lat': dropoff['lat'], 'lng': dropoff['lng'], 'address': dropoff['address']},
            )
        except Exception as e:
            return Response(
                {'error': 'route_service_error',
                 'message': f'Unable to calculate route: {str(e)}'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        current_loc = Location(current['lat'], current['lng'], current['address'])
        pickup_loc = Location(pickup['lat'], pickup['lng'], pickup['address'])
        dropoff_loc = Location(dropoff['lat'], dropoff['lng'], dropoff['address'])

        trip = calculate_trip(
            current_loc=current_loc,
            pickup_loc=pickup_loc,
            dropoff_loc=dropoff_loc,
            cycle_used=cycle_used,
            leg_a_miles=route['legs'][0]['distance_miles'],
            leg_a_hours=route['legs'][0]['duration_hours'],
            leg_b_miles=route['legs'][1]['distance_miles'],
            leg_b_hours=route['legs'][1]['duration_hours'],
            route_geometry=route['geometry'],
        )

        # Reverse geocode only stops (not driving segments) to stay within timeout
        for stop in trip.stops:
            if not stop.location.address:
                stop.location.address = reverse_geocode(stop.location.lat, stop.location.lng)

        start_time = trip.stops[0].arrival_time
        daily_logs = generate_daily_logs(trip.stops, trip.driving_segments, start_time, cycle_used)

        total_miles = trip.total_distance_miles
        fuel_cost = round(total_miles / 6.5 * 3.80, 2)

        stops_data = [
            {
                'type': s.type,
                'location': {'lat': s.location.lat, 'lng': s.location.lng, 'address': s.location.address},
                'arrival_time': s.arrival_time.isoformat(),
                'departure_time': s.departure_time.isoformat(),
                'duration_hours': s.duration_hours,
                'duty_status': s.duty_status,
                'cumulative_miles': s.cumulative_miles,
                'notes': s.notes,
            }
            for s in trip.stops
        ]

        segments_data = [
            {
                'start_time': seg.start_time.isoformat(),
                'end_time': seg.end_time.isoformat(),
                'duration_hours': seg.duration_hours,
                'miles': seg.miles,
                'start_location': {
                    'lat': seg.start_location.lat, 'lng': seg.start_location.lng,
                    'address': seg.start_location.address,
                },
                'end_location': {
                    'lat': seg.end_location.lat, 'lng': seg.end_location.lng,
                    'address': seg.end_location.address,
                },
            }
            for seg in trip.driving_segments
        ]

        plan = TripPlan.objects.create(
            current_location_address=current['address'],
            current_location_lat=current['lat'],
            current_location_lng=current['lng'],
            pickup_location_address=pickup['address'],
            pickup_location_lat=pickup['lat'],
            pickup_location_lng=pickup['lng'],
            dropoff_location_address=dropoff['address'],
            dropoff_location_lat=dropoff['lat'],
            dropoff_location_lng=dropoff['lng'],
            current_cycle_used=cycle_used,
            total_distance_miles=total_miles,
            total_duration_hours=trip.total_duration_hours,
            fuel_cost_estimate=fuel_cost,
            route_geometry=route['geometry'],
            stops=stops_data,
            driving_segments=segments_data,
            daily_logs=daily_logs,
        )

        return Response({
            'id': str(plan.id),
            'created_at': plan.created_at.isoformat(),
            'total_distance_miles': plan.total_distance_miles,
            'total_duration_hours': plan.total_duration_hours,
            'fuel_cost_estimate': fuel_cost,
            'number_of_stops': len(stops_data),
            'number_of_log_days': len(daily_logs),
            'route': {'geometry': route['geometry']},
            'stops': stops_data,
            'driving_segments': segments_data,
            'daily_logs': daily_logs,
        })


class TripPlanDetailView(APIView):
    def get(self, request, pk):
        try:
            plan = TripPlan.objects.get(pk=pk)
        except TripPlan.DoesNotExist:
            return Response(
                {'error': 'not_found', 'message': 'Trip plan not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({
            'id': str(plan.id),
            'created_at': plan.created_at.isoformat(),
            'total_distance_miles': plan.total_distance_miles,
            'total_duration_hours': plan.total_duration_hours,
            'fuel_cost_estimate': plan.fuel_cost_estimate,
            'number_of_stops': len(plan.stops) if plan.stops else 0,
            'number_of_log_days': len(plan.daily_logs) if plan.daily_logs else 0,
            'route': {'geometry': plan.route_geometry},
            'stops': plan.stops or [],
            'driving_segments': plan.driving_segments or [],
            'daily_logs': plan.daily_logs or [],
        })
