"""Redirect www.koreokorp.com to https://koreokorp.com in the existing Nginx Proxy Manager.

Run on the existing VPS as root (TASK-026). Like configure-existing-npm.py, it
backs up NPM's database first and uses NPM's own certificate and nginx
tooling, adding one Let's Encrypt certificate and one redirection host. It
refuses to run if any host already claims www.koreokorp.com, and removes its
certificate again if issuance fails. It does not touch other hosts.
"""
import datetime
import json
from pathlib import Path
import sqlite3
import subprocess

ROOT = Path('/opt/stacks/npm')
BACKUP = Path('/opt/stacks/koreokorp/backups/www-20261025')
DOMAIN = 'www.koreokorp.com'
TARGET = 'koreokorp.com'
BACKUP.mkdir(mode=0o700, parents=True, exist_ok=True)
connection = sqlite3.connect(ROOT / 'data/database.sqlite')
connection.row_factory = sqlite3.Row
for table in ('proxy_host', 'redirection_host', 'dead_host'):
    if connection.execute(f'SELECT id FROM {table} WHERE domain_names LIKE ? AND is_deleted=0', (f'%"{DOMAIN}"%',)).fetchone():
        raise SystemExit(f'{DOMAIN} already has a {table}; refusing to overwrite it.')
with sqlite3.connect(BACKUP / 'npm-before.sqlite') as backup:
    connection.backup(backup)

def node(code):
    result = subprocess.run(['docker', 'exec', '-w', '/app', 'npm', 'node', '-e', code], capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError((result.stderr + result.stdout)[-2000:])

now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
public = dict(connection.execute('SELECT * FROM proxy_host WHERE id=9 AND is_deleted=0').fetchone())
assert json.loads(public['domain_names']) == [TARGET], 'Public host changed; review before proceeding.'
source_cert = dict(connection.execute('SELECT * FROM certificate WHERE id=? AND provider=?', (public['certificate_id'], 'letsencrypt')).fetchone())
meta = {'letsencrypt_email': json.loads(source_cert['meta'])['letsencrypt_email'], 'letsencrypt_agree': True}
cursor = connection.execute('INSERT INTO certificate (created_on,modified_on,owner_user_id,is_deleted,provider,nice_name,domain_names,expires_on,meta) VALUES (?,?,?,0,?,?,?,?,?)',
    (now, now, source_cert['owner_user_id'], 'letsencrypt', DOMAIN, json.dumps([DOMAIN]), now, json.dumps(meta)))
certificate_id = cursor.lastrowid
connection.commit()

try:
    node(f"const n=require('./internal/nginx'); n.generateLetsEncryptRequestConfig({{id:{certificate_id},domain_names:['{DOMAIN}']}}).then(()=>n.reload()).then(()=>process.exit(0)).catch(e=>{{console.error(e.message);process.exit(1)}})")
    node(f"const c=require('./models/certificate');const internal=require('./internal/certificate'); c.query().findById({certificate_id}).then(row=>internal.requestLetsEncryptSsl(row)).then(()=>process.exit(0)).catch(e=>{{console.error(e.message);process.exit(1)}})")
except RuntimeError:
    connection.execute('UPDATE certificate SET is_deleted=1, modified_on=? WHERE id=?', (now, certificate_id))
    connection.commit()
    node(f"const n=require('./internal/nginx'); n.deleteLetsEncryptRequestConfig({{id:{certificate_id}}}).then(()=>n.reload()).then(()=>process.exit(0)).catch(e=>{{console.error(e.message);process.exit(1)}})")
    raise

certificate_path = ROOT / f'letsencrypt/live/npm-{certificate_id}/fullchain.pem'
end_date = subprocess.check_output(['openssl', 'x509', '-enddate', '-noout', '-in', str(certificate_path)], text=True).strip().split('=', 1)[1]
expires = datetime.datetime.strptime(end_date, '%b %d %H:%M:%S %Y %Z').strftime('%Y-%m-%d %H:%M:%S')
connection.execute('UPDATE certificate SET expires_on=?,modified_on=? WHERE id=?', (expires, now, certificate_id))

# ssl_forced stays off so http://www goes straight to https://koreokorp.com in
# one 301 instead of hopping through https://www first; neither port serves
# content, and the apex host keeps its own HSTS.
host = {'created_on': now, 'modified_on': now, 'owner_user_id': public['owner_user_id'], 'is_deleted': 0,
        'domain_names': json.dumps([DOMAIN]), 'forward_scheme': 'https', 'forward_domain_name': TARGET,
        'forward_http_code': 301, 'preserve_path': 1, 'certificate_id': certificate_id, 'ssl_forced': 0,
        'block_exploits': public['block_exploits'], 'http2_support': 1, 'hsts_enabled': 0,
        'hsts_subdomains': 0, 'advanced_config': '', 'meta': '{}', 'enabled': 1}
columns = list(host)
cursor = connection.execute(f"INSERT INTO redirection_host ({','.join(columns)}) VALUES ({','.join('?' for _ in columns)})", tuple(host[key] for key in columns))
host_id = cursor.lastrowid
connection.commit()
node(f"const n=require('./internal/nginx');const m=require('./models/redirection_host'); n.deleteLetsEncryptRequestConfig({{id:{certificate_id}}}).then(()=>m.query().findById({host_id}).withGraphFetched('[certificate]')).then(row=>n.configure(m,'redirection_host',row)).then(()=>process.exit(0)).catch(e=>{{console.error(e.message);process.exit(1)}})")
(BACKUP / 'www-ids.json').write_text(json.dumps({'redirection_host': host_id, 'certificate': certificate_id}))
print(f'{DOMAIN} redirects to https://{TARGET} with trusted TLS; redirection_host={host_id}, certificate={certificate_id}, expires={expires}')
