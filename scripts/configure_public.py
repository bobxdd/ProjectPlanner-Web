"""Build only the public, RLS-protected Supabase connection settings.

Do not put secret/service-role keys in the browser: even a private GitHub repo
publishes the resulting JS openly via GitHub Pages.
"""
from pathlib import Path
import json, os, re, sys
url=os.environ.get('SUPABASE_URL','').strip().rstrip('/')
key=os.environ.get('SUPABASE_PUBLISHABLE_KEY','').strip()
if not re.fullmatch(r'https://[a-z0-9-]+\.supabase\.co',url,re.I):
    sys.exit('Missing or invalid SUPABASE_URL GitHub Actions variable')
if not re.fullmatch(r'sb_publishable_[A-Za-z0-9_-]+',key):
    sys.exit('SUPABASE_PUBLISHABLE_KEY must be a publishable public key (never a secret)')
path=Path(__file__).resolve().parents[1]/'docs/cloud/config.js'
path.write_text(f'export const SUPABASE_URL = {json.dumps(url)};\n'
                f'export const SUPABASE_PUBLISHABLE_KEY = {json.dumps(key)};\n')
print('Public config created. No private key was accessed.')
