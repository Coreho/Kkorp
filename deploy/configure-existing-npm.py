"""Configure the existing KoreoKorp Nginx Proxy Manager, with private backups.

Run on the existing VPS as root after starting koreokorp-control on network edge.
This deliberately uses NPM's own renderer and certificate tooling. It does not
replace unrelated proxies or certificates. Existing admin host: abort and review.
"""
import datetime
import json
from pathlib import Path
import sqlite3
import subprocess

ROOT = Path('/opt/stacks/npm')
BACKUP = Path('/opt/stacks/koreokorp/backups/admin-20261024')
DOMAIN = 'adctrl.koreokorp.com'
BACKUP.mkdir(mode=0o700, parents=True, exist_ok=True)
connection = sqlite3.connect(ROOT / 'data/database.sqlite')
connection.row_factory = sqlite3.Row
if connection.execute('SELECT id FROM proxy_host WHERE domain_names LIKE ? AND is_deleted=0', (f'%{DOMAIN}%',)).fetchone():
    raise SystemExit('Admin host already exists; refusing to overwrite it.')
with sqlite3.connect(BACKUP / 'npm-before.sqlite') as backup:
    connection.backup(backup)

def node(code):
    result = subprocess.run(['docker', 'exec', '-w', '/app', 'npm', 'node', '-e', code], capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError((result.stderr + result.stdout)[-2000:])

now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
source_cert = dict(connection.execute('SELECT * FROM certificate WHERE id=10 AND provider=?', ('letsencrypt',)).fetchone())
source_meta = json.loads(source_cert['meta'])
meta = {'letsencrypt_email': source_meta['letsencrypt_email'], 'letsencrypt_agree': True}
cursor = connection.execute('INSERT INTO certificate (created_on,modified_on,owner_user_id,is_deleted,provider,nice_name,domain_names,expires_on,meta) VALUES (?,?,?,0,?,?,?,?,?)',
    (now, now, source_cert['owner_user_id'], 'letsencrypt', DOMAIN, json.dumps([DOMAIN]), now, json.dumps(meta)))
certificate_id = cursor.lastrowid
connection.commit()

node(f"const n=require('./internal/nginx'); n.generateLetsEncryptRequestConfig({{id:{certificate_id},domain_names:['{DOMAIN}']}}).then(()=>n.reload()).then(()=>process.exit(0)).catch(e=>{{console.error(e.message);process.exit(1)}})")
node(f"const c=require('./models/certificate');const internal=require('./internal/certificate'); c.query().findById({certificate_id}).then(row=>internal.requestLetsEncryptSsl(row)).then(()=>process.exit(0)).catch(e=>{{console.error(e.message);process.exit(1)}})")
certificate_path = ROOT / f'letsencrypt/live/npm-{certificate_id}/fullchain.pem'
end_date = subprocess.check_output(['openssl', 'x509', '-enddate', '-noout', '-in', str(certificate_path)], text=True).strip().split('=', 1)[1]
expires = datetime.datetime.strptime(end_date, '%b %d %H:%M:%S %Y %Z').strftime('%Y-%m-%d %H:%M:%S')
connection.execute('UPDATE certificate SET expires_on=?,modified_on=? WHERE id=?', (expires, now, certificate_id))
source_host = dict(connection.execute('SELECT * FROM proxy_host WHERE id=9 AND is_deleted=0').fetchone())
assert source_host['forward_host'] == 'koreokorp-prod', 'Public upstream changed; review before proceeding.'
host = {**source_host, 'created_on': now, 'modified_on': now, 'domain_names': json.dumps([DOMAIN]),
        'forward_host': 'koreokorp-control', 'forward_port': 4173, 'certificate_id': certificate_id,
        'advanced_config': 'client_max_body_size 8m;\nproxy_read_timeout 30s;\n',
        'locations': '[]', 'meta': '{}', 'ssl_forced': 1, 'http2_support': 1, 'hsts_enabled': 1}
host.pop('id')
columns = list(host)
cursor = connection.execute(f"INSERT INTO proxy_host ({','.join(columns)}) VALUES ({','.join('?' for _ in columns)})", tuple(host[key] for key in columns))
host_id = cursor.lastrowid
connection.commit()
node(f"const n=require('./internal/nginx');const m=require('./models/proxy_host'); n.deleteLetsEncryptRequestConfig({{id:{certificate_id}}}).then(()=>m.query().findById({host_id}).withGraphFetched('[certificate,access_list.[clients,items]]')).then(row=>n.configure(m,'proxy_host',row)).then(()=>process.exit(0)).catch(e=>{{console.error(e.message);process.exit(1)}})")
(BACKUP / 'admin-ids.json').write_text(json.dumps({'proxy_host': host_id, 'certificate': certificate_id}))
print(f'Admin host configured with trusted TLS: {DOMAIN}; host={host_id}, certificate={certificate_id}')
