from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User, PatientProfile, DoctorProfile, TriageStaffProfile
from .serializers import (
    UserSerializer,
    RegisterPatientSerializer,
    CustomTokenObtainPairSerializer,
    PatientProfileSerializer,
    DoctorProfileSerializer,
)
from .permissions import IsClinicalStaff, IsDoctor, IsPatient, IsPatientOwnerOrClinicalStaff

class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Login endpoint returning JWT tokens enriched with user role and profile details.
    """
    serializer_class = CustomTokenObtainPairSerializer


class RegisterPatientView(APIView):
    """
    Register a patient and return their JWT tokens and profile immediately.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterPatientSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            user_data = UserSerializer(user).data

            return Response({
                "message": "Patient registered successfully.",
                "tokens": {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                },
                "user": user_data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CurrentUserView(APIView):
    """
    Retrieve or update currently authenticated user and nested role profile.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """
    Logout endpoint: Accepts refresh token to blacklist (if enabled) and confirms sign-out.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                # Even if blacklisting is disabled or token invalid, log out gracefully
                pass
        return Response({"message": "Successfully logged out."}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsClinicalStaff])
def clinical_patients_list(request):
    """
    Clinical data endpoint: Only DOCTOR or TRIAGE_STAFF can access.
    """
    patients = PatientProfile.objects.all().order_by('-created_at')[:50]
    serializer = PatientProfileSerializer(patients, many=True)
    return Response({
        "count": patients.count(),
        "patients": serializer.data
    })
