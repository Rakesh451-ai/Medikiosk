from django.urls import path
from .admin_views import (
    AdminLoginView,
    AdminStatsView,
    AdminUsersListView,
    AdminUserDetailActionView,
    AdminBlockedIdentifiersView,
    AdminUnblockIdentifierView,
    AdminSecurityLogsView,
    AdminSimulateIncidentView,
)

urlpatterns = [
    # Dedicated Admin Authentication Gateway
    path('login/', AdminLoginView.as_view(), name='admin-auth-login'),

    # KPI Stats
    path('stats/', AdminStatsView.as_view(), name='admin-stats'),

    # User Management
    path('users/', AdminUsersListView.as_view(), name='admin-users-list'),
    path('users/<int:user_id>/', AdminUserDetailActionView.as_view(), name='admin-user-detail'),

    # Security, Blacklist & Spammers
    path('security/spammers/', AdminBlockedIdentifiersView.as_view(), name='admin-spammers-list'),
    path('security/block/', AdminBlockedIdentifiersView.as_view(), name='admin-security-block'),
    path('security/unblock/', AdminUnblockIdentifierView.as_view(), name='admin-security-unblock'),
    path('security/logs/', AdminSecurityLogsView.as_view(), name='admin-security-logs'),
    path('security/simulate/', AdminSimulateIncidentView.as_view(), name='admin-simulate-incident'),
]
