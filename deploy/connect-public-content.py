"""Connect only the public KoreoKorp content routes in the existing NPM host."""
import datetime
import json
from pathlib import Path
import sqlite3
import subprocess
import sys

root = Path('/opt/stacks/npm')
backup = Path('/opt/stacks/koreokorp/backups/admin-20261024')
backup.mkdir(mode=0o700, parents=True, exist_ok=True)
connection = sqlite3.connect(root / 'data/database.sqlite')
connection.row_factory = sqlite3.Row
staging = '--staging' in sys.argv
host_id = 10 if staging else 9
domain = 'staging.koreokorp.com' if staging else 'koreokorp.com'
upstream = 'koreokorp-app' if staging else 'koreokorp-prod'
host = dict(connection.execute('SELECT * FROM proxy_host WHERE id=? AND is_deleted=0', (host_id,)).fetchone())
assert json.loads(host['domain_names']) == [domain], 'Unexpected host.'
assert host['forward_host'] == upstream, 'Unexpected upstream.'
assert '# Owner content routes' not in host['advanced_config'], 'Already configured.'
(backup / f'host-{host_id}-advanced-before.txt').write_text(host['advanced_config'])
(backup / f'proxy-host-{host_id}-before.conf').write_bytes((root / f'data/nginx/proxy_host/{host_id}.conf').read_bytes())
snippet = '''
# Owner content routes (persistent sidecar; public read access only)
location = /api/content {
    resolver 127.0.0.11 valid=30s;
    set $content_upstream koreokorp-control;
    proxy_pass http://$content_upstream:4173;
    proxy_set_header Host koreokorp.com;
    proxy_set_header X-Forwarded-For $remote_addr;
}
location ^~ /uploads/ {
    resolver 127.0.0.11 valid=30s;
    set $content_upstream koreokorp-control;
    proxy_pass http://$content_upstream:4173;
    proxy_set_header Host koreokorp.com;
}
location ^~ /api/admin/ { return 404; }
location ^~ /admin { return 404; }
'''
connection.execute('UPDATE proxy_host SET advanced_config=?, modified_on=? WHERE id=?',
    (host['advanced_config'] + snippet, datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M:%S'), host_id))
connection.commit()
code = f"const n=require('./internal/nginx');const m=require('./models/proxy_host');m.query().findById({host_id}).withGraphFetched('[certificate,access_list.[clients,items]]').then(row=>n.configure(m,'proxy_host',row)).then(()=>process.exit(0)).catch(e=>{{console.error(e.message);process.exit(1)}})"
subprocess.run(['docker', 'exec', '-w', '/app', 'npm', 'node', '-e', code], check=True)
print('Public read-only content routes connected; existing upstream and miniature downloads preserved.')
