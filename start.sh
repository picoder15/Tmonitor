#!/data/data/com.termux/files/usr/bin/bash
# ─────────────────────────────────────────────────────
# Termux Performance Tracker - Startup Script
# ─────────────────────────────────────────────────────

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "╔══════════════════════════════════════════════════╗"
echo "║   Termux Performance Tracker & Monitor           ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ─── Check Python ───
if ! command -v python &> /dev/null && ! command -v python3 &> /dev/null; then
    echo "[!] Python not found. Installing..."
    pkg install -y python
fi

PYTHON=$(command -v python3 || command -v python)
echo "[✓] Python: $PYTHON ($($PYTHON --version 2>&1))"

# ─── Check pip ───
if ! $PYTHON -m pip --version &> /dev/null; then
    echo "[!] pip not found. Installing..."
    pkg install -y python-pip 2>/dev/null || $PYTHON -m ensurepip --upgrade
fi
echo "[✓] pip: $($PYTHON -m pip --version 2>&1 | head -1)"

# ─── Install Python Dependencies ───
echo ""
echo "[*] Installing Python dependencies..."
$PYTHON -m pip install -q flask flask-cors 2>&1 | tail -1
echo "[✓] Flask and dependencies installed."

# ─── Check optional tools ───
echo ""
echo "[*] Checking optional tools..."

if command -v termux-battery-status &> /dev/null; then
    echo "  [✓] Termux:API (battery monitoring available)"
else
    echo "  [!] Termux:API not found. Install Termux:API app from F-Droid for battery monitoring."
    echo "      Then run: pkg install termux-api"
fi

if command -v nmap &> /dev/null; then
    echo "  [✓] nmap (advanced port scanning available)"
else
    echo "  [i] nmap not installed. Port checking will use basic TCP connect."
    echo "      Optional: pkg install nmap"
fi

if command -v crontab &> /dev/null; then
    echo "  [✓] crontab (cron job management available)"
else
    echo "  [i] crontab not installed. Cron features will be limited."
    echo "      Optional: pkg install cronie"
fi

# ─── Check if frontend is built ───
echo ""
if [ -d "dist" ] && [ -f "dist/index.html" ]; then
    echo "[✓] Frontend build found in dist/"
else
    echo "[!] Frontend build not found in dist/."
    echo "    If you have Node.js, run: npm install && npm run build"
    echo "    The backend will still start but the UI won't load."
fi

# ─── Create data directory ───
mkdir -p data
echo "[✓] Data directory ready."

# ─── Start the server ───
echo ""
echo "═══════════════════════════════════════════════════"
echo "  Starting server..."
echo "  Dashboard: http://localhost:5000"
echo "  Login: admin / More@123 (if enabled in config.json)"
echo "  Config: $SCRIPT_DIR/config.json"
echo "  Database: $SCRIPT_DIR/data/termux_monitor.db"
echo ""
echo "  Press Ctrl+C to stop."
echo "═══════════════════════════════════════════════════"
echo ""

$PYTHON backend/app.py
