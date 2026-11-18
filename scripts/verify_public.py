"""Fail closed if the GitHub Pages browser bundle lacks a valid PUBLIC Supabase configuration.

The publishable key is intentionally public. Account credentials and private
project data are protected by server-side session checks and RLS.
"""
from pathlib import Path
import re

config = (Path(__file__).resolve().parents[1] / "docs/cloud/config.js").read_text()
url = re.search(r"SUPABASE_URL\s*=\s*['\"]([^'\"]+)['\"]", config)
key = re.search(r"SUPABASE_PUBLISHABLE_KEY\s*=\s*['\"]([^'\"]+)['\"]", config)
assert url is not None and re.fullmatch(r"https://[a-z0-9-]+\.supabase\.co", url.group(1))
assert key is not None and re.fullmatch(r"sb_publishable_[A-Za-z0-9_-]+", key.group(1))
assert "sb_secret_" not in config and "SUPABASE_SERVICE_ROLE_KEY" not in config
print("Browser config verified: valid public project URL and publishable key")
