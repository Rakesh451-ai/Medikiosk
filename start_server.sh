#!/bin/bash
# ==============================================================================
# MediKiosk Unified Server Launcher with Public HTTPS Access
# ==============================================================================
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo "=================================================="
echo " Starting MediKiosk Health Platform"
echo "=================================================="

# 1. Start Django Backend if not already running
if ! lsof -i :8000 >/dev/null 2>&1 && ! ss -tulpn 2>/dev/null | grep -q ':8000 '; then
    echo "Starting Django Backend on port 8000..."
    cd "$PROJECT_ROOT/backend"
    if [ -f "venv/bin/python" ]; then
        nohup venv/bin/python manage.py runserver 0.0.0.0:8000 > "$PROJECT_ROOT/backend.log" 2>&1 &
    else
        nohup python3 manage.py runserver 0.0.0.0:8000 > "$PROJECT_ROOT/backend.log" 2>&1 &
    fi
    echo "✓ Backend started (PID: $!)"
else
    echo "✓ Django Backend is already running on port 8000"
fi

# 2. Start Vite Frontend if not already running
if ! lsof -i :5173 >/dev/null 2>&1 && ! ss -tulpn 2>/dev/null | grep -q ':5173 '; then
    echo "Starting Vite Frontend on port 5173..."
    cd "$PROJECT_ROOT/frontend"
    nohup npm run dev -- --host 0.0.0.0 --port 5173 > "$PROJECT_ROOT/frontend.log" 2>&1 &
    echo "✓ Frontend started (PID: $!)"
else
    echo "✓ Vite Frontend is already running on port 5173"
fi

# 3. Detect Local Network IP
LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "127.0.0.1")

echo ""
echo "=================================================="
echo " MediKiosk Access Links"
echo "=================================================="
echo " Local Device:        http://localhost:5173"
echo " Same Wi-Fi Network:  http://${LOCAL_IP}:5173"
echo "=================================================="
echo ""
echo "To share a public HTTPS link for ANY device anywhere (with Camera & Mic enabled):"
echo "Run: $PROJECT_ROOT/bin/cloudflared tunnel --url http://127.0.0.1:5173"
echo "=================================================="
