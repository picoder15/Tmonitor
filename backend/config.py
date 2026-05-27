"""
Configuration loader for Termux Performance Tracker.
Reads config.json from the project root directory.
"""

import json
import os

CONFIG_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'config.json')

DEFAULT_CONFIG = {
    "login": "on",
    "username": "admin",
    "password": "More@123",
    "refresh_interval": 5,
    "data_retention_days": 30,
    "cpu_threshold": 85,
    "memory_threshold": 80,
    "storage_threshold": 90,
    "host": "0.0.0.0",
    "port": 5000,
    "secret_key": "termux-monitor-secret-2024"
}


def load_config():
    """Load configuration from config.json, falling back to defaults."""
    config = DEFAULT_CONFIG.copy()
    try:
        if os.path.exists(CONFIG_FILE):
            with open(CONFIG_FILE, 'r') as f:
                user_config = json.load(f)
                config.update(user_config)
    except (json.JSONDecodeError, IOError) as e:
        print(f"[Config] Warning: Could not read {CONFIG_FILE}: {e}. Using defaults.")
    return config


def save_config(config_data):
    """Save configuration back to config.json."""
    try:
        current = load_config()
        current.update(config_data)
        with open(CONFIG_FILE, 'w') as f:
            json.dump(current, f, indent=2)
        return True
    except IOError as e:
        print(f"[Config] Error saving config: {e}")
        return False


# Global config instance
config = load_config()
