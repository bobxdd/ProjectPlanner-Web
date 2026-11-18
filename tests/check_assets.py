from pathlib import Path
from html.parser import HTMLParser
import re
root=Path(__file__).resolve().parents[1];docs=root/'docs'
class Assets(HTMLParser):
    def __init__(self):super().__init__();self.links=[]
    def handle_starttag(self,tag,attrs):
        d=dict(attrs)
        if tag=='script' and d.get('src'):self.links.append(d['src'])
        if tag=='link' and d.get('href'):self.links.append(d['href'])
for name in ('index.html','planner.html','cloud/download.html'):
    path=docs/name;parser=Assets();parser.feed(path.read_text())
    for src in parser.links:
        if src.startswith(('https://','http://','data:','//')):continue
        assert (path.parent/src.split('?',1)[0]).resolve().is_file(),f'{name}: missing asset {src}'
index=(docs/'index.html').read_text()
assert 'Benutzername' in index and 'E-Mail-Adresse<input' not in index
assert 'recovery-code' in index and 'cloud/auth.js' in index
planner=(docs/'planner.html').read_text()
assert 'cloud/runtime.js' in planner and 'qr-generator' not in planner and 'qr-quick-open' not in planner
assert not (docs/'qr-generator.js').exists()
for name in ('style.css','experience.css','orbit.css','experience.js','orbit.js','file-context.js','annotation-layer.js'):
    assert (docs/name).stat().st_size>1000, name
config=(docs/'cloud/config.js').read_text()
key=re.search(r"SUPABASE_PUBLISHABLE_KEY\s*=\s*['\"]([^'\"]*)['\"]",config)
assert key and not key.group(1).startswith(('sb_secret_','service_role'))
sql=(root/'supabase/001_username_accounts.sql').read_text()
for item in ('planner_register','planner_login','planner_recover','planner_state_put','planner_session_account','enable row level security','revoke all on public.planner_accounts','password_hash','recovery_hash'):
    assert item in sql, item
assert 'service_role' not in (docs/'cloud/auth.js').read_text().lower()
assert 'SUPABASE_SERVICE_ROLE_KEY' not in ''.join(x.read_text() for x in (docs/'cloud').glob('*.js'))
print('HTML asset links, no-email form, private SQL and original UI modules: OK')
