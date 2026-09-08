from rest_framework import permissions
from .models import User

class IsDoctor(permissions.BasePermission):
    """Allows access only to users with the DOCTOR role."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == User.Role.DOCTOR
        )

class IsTriageStaff(permissions.BasePermission):
    """Allows access only to users with the TRIAGE_STAFF role."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == User.Role.TRIAGE_STAFF
        )

class IsClinicalStaff(permissions.BasePermission):
    """Allows access to DOCTOR, TRIAGE_STAFF, or ADMIN."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role in [User.Role.DOCTOR, User.Role.TRIAGE_STAFF, User.Role.ADMIN]
        )

class IsPatient(permissions.BasePermission):
    """Allows access only to users with the PATIENT role."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == User.Role.PATIENT
        )

class IsPatientOwnerOrClinicalStaff(permissions.BasePermission):
    """
    Object-level permission allowing:
    - DOCTOR / TRIAGE_STAFF / ADMIN to access clinical data.
    - PATIENT to access ONLY their own records.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        # Doctors, triage staff, and admins can view and manage clinical records
        if request.user.role in [User.Role.DOCTOR, User.Role.TRIAGE_STAFF, User.Role.ADMIN]:
            return True

        # If patient, verify record ownership
        if hasattr(obj, 'patient'):
            return obj.patient == request.user
        elif hasattr(obj, 'user'):
            return obj.user == request.user
        elif isinstance(obj, User):
            return obj == request.user

        return False


class IsAdminUserRole(permissions.BasePermission):
    """Allows access only to authenticated users with ADMIN role or is_staff / is_superuser."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.role == User.Role.ADMIN or request.user.is_staff or request.user.is_superuser)
        )

