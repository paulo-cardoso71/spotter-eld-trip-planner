from django.urls import path
from . import views

urlpatterns = [
    path('trip-plan/', views.TripPlanCreateView.as_view(), name='trip-plan-create'),
    path('trip-plan/<uuid:pk>/', views.TripPlanDetailView.as_view(), name='trip-plan-detail'),
]
