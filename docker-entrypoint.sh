#!/bin/bash
set -e

echo "=== Running Database Migrations ==="
USE_SQLITE=True python manage.py migrate --no-input

echo "=== Seeding Demo Clinical Data ==="
USE_SQLITE=True python manage.py seed_data || true

echo "=== Starting MediKiosk Server on port ${PORT:-8000} ==="
exec gunicorn medikiosk_core.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 2 --timeout 120
