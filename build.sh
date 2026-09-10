#!/usr/bin/env bash
# exit on error
set -o errexit

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo "=== 1. Building React Frontend ==="
cd frontend
npm install
npm run build
cd ..

echo "=== 2. Installing Python Requirements ==="
cd backend
pip install -r requirements.txt

echo "=== 3. Running Database Migrations ==="
USE_SQLITE=True python manage.py migrate --no-input

echo "=== 4. Seeding Initial Clinical Data ==="
USE_SQLITE=True python manage.py seed_data || true

echo "=== 5. Build Complete ==="
