#!/bin/bash
# ==============================================================================
# MediKiosk Unified Server Launcher with Public HTTPS Access
# ==============================================================================
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo "=================================================="
echo " Starting MediKiosk Production Server"
echo "=================================================="

is_port_in_use() {
    python3 -c "import socket; s = socket.socket(); s.settimeout(0.5); exit(0 if s.connect_ex(('127.0.0.1', int('$1'))) == 0 else 1)" 2>/dev/null
}

# 1. Ensure Frontend Build is ready for Unified Production Serving
if [ ! -f "$PROJECT_ROOT/frontend/dist/index.html" ]; then
    echo "Building Frontend for Production..."
    cd "$PROJECT_ROOT/frontend"
    npm run build
    cd "$PROJECT_ROOT"
fi

# 2. Start Django Unified Server on port 8000 (serves both React & DRF API)
if ! is_port_in_use 8000; then
    echo "Starting Unified Django Server on port 8000..."
    cd "$PROJECT_ROOT/backend"
    python3 -c "
import subprocess, sys, os
py_bin = '$PROJECT_ROOT/backend/venv/bin/python' if os.path.exists('$PROJECT_ROOT/backend/venv/bin/python') else 'python3'
with open('$PROJECT_ROOT/backend.log', 'w') as f:
    subprocess.Popen([py_bin, 'manage.py', 'runserver', '0.0.0.0:8000'],
                     stdout=f, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL,
                     cwd='$PROJECT_ROOT/backend', start_new_session=True)
"
    echo "✓ Server started on port 8000"
else
    echo "✓ Unified Server is already running on port 8000"
fi

# 3. Start Public Cloudflare Tunnel (Tunneling directly to port 8000)
if ! pgrep -f "cloudflared tunnel" >/dev/null 2>&1; then
    echo "Starting Public Tunnel..."
    cd "$PROJECT_ROOT"
    > "$PROJECT_ROOT/tunnel.log"
    python3 -c "
import subprocess
with open('$PROJECT_ROOT/tunnel.log', 'w') as f:
    subprocess.Popen(['$PROJECT_ROOT/bin/cloudflared', 'tunnel', '--url', 'http://127.0.0.1:8000'],
                     stdout=f, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL,
                     cwd='$PROJECT_ROOT', start_new_session=True)
"
    echo "✓ Public Tunnel started in background"
else
    echo "✓ Public Tunnel is already running"
fi

# 4. Detect Local Network IP & Public Tunnel URL
LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "127.0.0.1")

# Extract public HTTPS URL from tunnel.log (wait up to 15s)
PUBLIC_URL=""
for i in {1..15}; do
    PUBLIC_URL=$(grep -o 'https://[a-zA-Z0-9.-]*\.trycloudflare\.com' "$PROJECT_ROOT/tunnel.log" 2>/dev/null | tail -n 1 || true)
    if [ -n "$PUBLIC_URL" ]; then
        break
    fi
    sleep 1
done

echo ""
echo "=================================================="
echo " MediKiosk Access Links"
echo "=================================================="
if [ -n "$PUBLIC_URL" ]; then
    echo " 🌐 Public HTTPS (ANY DEVICE, ANYWHERE):"
    echo "    $PUBLIC_URL"
    echo ""
    echo " 📱 Scan QR Code to open on phone / tablet:"
    python3 -c "import qrcode; qr = qrcode.QRCode(); qr.add_data('$PUBLIC_URL'); qr.print_ascii(invert=True)" 2>/dev/null || true
else
    echo " 🌐 Public HTTPS: Initializing... run './start_server.sh' or check tunnel.log"
fi
echo " 📶 Same Wi-Fi Network: http://${LOCAL_IP}:8000"
echo " 💻 Local Device:       http://localhost:8000"
echo "=================================================="
echo "NOTE: Processes are detached in independent sessions."
echo "You can safely close this terminal and the server stays UP."
echo "To stop the server at any time, run: ./stop_server.sh"
echo "=================================================="
