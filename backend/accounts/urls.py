from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    CustomTokenObtainPairView,
    RegisterPatientView,
    CurrentUserView,
    LogoutView,
    clinical_patients_list,
)

urlpatterns = [
    # Auth & Tokens
    path('login/', CustomTokenObtainPairView.as_view(), name='auth-login'),
    path('register/', RegisterPatientView.as_view(), name='auth-register'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
    path('me/', CurrentUserView.as_view(), name='auth-current-user'),

    # Clinical endpoint demonstrating Role-Based DRF Permissions
    path('clinical/patients/', clinical_patients_list, name='clinical-patients-list'),
]
