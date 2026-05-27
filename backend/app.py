"""
Termux Performance Tracker - Main Flask Application.
Serves the React frontend and provides REST API endpoints.
Starts background data collectors on launch.
"""

import os
import sys

# Add project root to path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

from flask import Flask, send_from_directory
from flask_cors import CORS

from backend.config import config
from backend.database import init_db
from backend.routes import api
from backend.collector import collector_manager


def create_app():
    """Create and configure the Flask application."""

    # Determine the frontend dist directory
    dist_dir = os.path.join(project_root, 'dist')

    app = Flask(__name__, static_folder=dist_dir, static_url_path='')
    app.config['SECRET_KEY'] = config.get('secret_key', 'termux-monitor-secret')

    # Enable CORS for development
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Register API blueprint
    app.register_blueprint(api)

    # Initialize database
    with app.app_context():
        init_db()

    # ─── Serve React Frontend ───

    @app.route('/')
    def serve_index():
        """Serve the React app."""
        if os.path.exists(os.path.join(dist_dir, 'index.html')):
            return send_from_directory(dist_dir, 'index.html')
        return '''
        <html>
        <head><title>Termux Monitor</title></head>
        <body style="background:#1a1a2e;color:#e0e0e0;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
            <div style="text-align:center;">
                <h1>🖥️ Termux Performance Tracker</h1>
                <p>Backend is running! But frontend build was not found.</p>
                <p>Build the frontend first:</p>
                <code style="background:#333;padding:10px;border-radius:5px;display:block;margin:10px auto;max-width:400px;">
                    npm install && npm run build
                </code>
                <p>Then restart the server.</p>
                <hr style="border-color:#333;">
                <p>API is available at <a href="/api/system/overview" style="color:#4fc3f7;">/api/system/overview</a></p>
            </div>
        </body>
        </html>
        ''', 200

    @app.route('/<path:path>')
    def serve_static(path):
        """Serve static files or fallback to index.html for SPA routing."""
        file_path = os.path.join(dist_dir, path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return send_from_directory(dist_dir, path)
        # SPA fallback - return index.html for client-side routing
        if os.path.exists(os.path.join(dist_dir, 'index.html')):
            return send_from_directory(dist_dir, 'index.html')
        return '', 404

    return app


def main():
    """Main entry point."""
    app = create_app()

    # Start background collectors
    print("[App] Starting background data collectors...")
    collector_manager.start()

    host = config.get('host', '0.0.0.0')
    port = config.get('port', 5000)

    print(f"[App] Server starting on http://{host}:{port}")
    print(f"[App] Login: {'enabled' if config.get('login', 'on') == 'on' else 'disabled'}")
    print(f"[App] Refresh interval: {config.get('refresh_interval', 5)}s")
    print(f"[App] Data retention: {config.get('data_retention_days', 30)} days")
    print()

    try:
        app.run(
            host=host,
            port=port,
            debug=False,
            threaded=True,
            use_reloader=False  # Don't reload - we have background threads
        )
    except KeyboardInterrupt:
        print("\n[App] Shutting down...")
        collector_manager.stop()
    except Exception as e:
        print(f"[App] Error: {e}")
        collector_manager.stop()
        raise


if __name__ == '__main__':
    main()
