from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import TripPlan
from .serializers import TripPlanRequestSerializer


class TripPlanCreateView(APIView):
    def post(self, request):
        serializer = TripPlanRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'error': 'validation_error', 'details': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # TODO: wire up in Task 5
        return Response({'message': 'stub'}, status=status.HTTP_200_OK)


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
