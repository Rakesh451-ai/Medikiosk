#!/bin/bash
# ==============================================================================
# MediKiosk Unified Server Stopper
# ==============================================================================
echo "Stopping MediKiosk services..."

pkill -f "cloudflared tunnel" 2>/dev/null && echo "✓ Cloudflare Tunnel stopped" || echo "- Cloudflare Tunnel was not running"
pkill -f "runserver 0.0.0.0:8000" 2>/dev/null && echo "✓ Backend stopped" || echo "- Backend was not running"
pkill -f "vite.*5173" 2>/dev/null && echo "✓ Frontend stopped" || echo "- Frontend was not running"

echo "All MediKiosk services stopped."
