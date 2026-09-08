from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    User,
    PatientProfile,
    DoctorProfile,
    TriageStaffProfile,
    OTPVerification,
    BlockedIdentifier,
    SecurityAuditLog,
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = (
        'username',
        'email',
        'role',
        'is_flagged_spammer',
        'spam_score',
        'is_active',
        'is_staff',
        'date_joined',
    )
    list_filter = ('role', 'is_flagged_spammer', 'is_active', 'is_staff')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    fieldsets = BaseUserAdmin.fieldsets + (
        ('MediKiosk & Security Roles', {
            'fields': ('role', 'is_flagged_spammer', 'spam_score', 'spam_notes'),
        }),
    )


@admin.register(PatientProfile)
class PatientProfileAdmin(admin.ModelAdmin):
    list_display = ('name', 'phone', 'mock_aadhaar_id', 'mock_abha_id', 'gender', 'age', 'created_at')
    search_fields = ('name', 'phone', 'mock_aadhaar_id', 'mock_abha_id')
    list_filter = ('gender', 'preferred_language')


@admin.register(DoctorProfile)
class DoctorProfileAdmin(admin.ModelAdmin):
    list_display = ('name', 'department', 'specialization', 'room_number', 'created_at')
    search_fields = ('name', 'department', 'specialization')


@admin.register(TriageStaffProfile)
class TriageStaffProfileAdmin(admin.ModelAdmin):
    list_display = ('name', 'station_id', 'shift', 'created_at')


@admin.register(OTPVerification)
class OTPVerificationAdmin(admin.ModelAdmin):
    list_display = ('identifier', 'otp_code', 'identifier_type', 'is_verified', 'created_at')
    search_fields = ('identifier', 'otp_code')
    list_filter = ('identifier_type', 'is_verified')


@admin.register(BlockedIdentifier)
class BlockedIdentifierAdmin(admin.ModelAdmin):
    list_display = ('identifier', 'identifier_type', 'is_active', 'reason', 'created_at', 'blocked_by')
    search_fields = ('identifier', 'reason')
    list_filter = ('identifier_type', 'is_active')


@admin.register(SecurityAuditLog)
class SecurityAuditLogAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'risk_level', 'event_type', 'identifier', 'ip_address')
    search_fields = ('identifier', 'ip_address', 'details')
    list_filter = ('risk_level', 'event_type')
    readonly_fields = ('created_at',)

