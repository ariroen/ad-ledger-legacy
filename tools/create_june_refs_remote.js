const fs = require('fs');
const http = require('http');
const crypto = require('crypto');
const path = require('path');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
}

loadEnvFile(path.join(process.cwd(), '.env'));

function createAdminToken() {
  const payload = Buffer.from(JSON.stringify({
    exp: Date.now() + 12 * 60 * 60 * 1000,
    nonce: crypto.randomBytes(8).toString('hex'),
  })).toString('base64url');
  const sig = crypto
    .createHmac('sha256', process.env.ADMIN_SESSION_SECRET)
    .update(payload)
    .digest('base64url');
  return payload + '.' + sig;
}

function request(method, route, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const req = http.request({
      hostname: '127.0.0.1',
      port: 3000,
      path: route,
      method,
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: raw ? JSON.parse(raw) : {} });
        } catch (error) {
          reject(new Error('Bad JSON ' + res.statusCode + ': ' + raw.slice(0, 200)));
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  const token = createAdminToken();
  const payload = JSON.parse(fs.readFileSync('/tmp/june_procurement_entries_for_refs.json', 'utf8'));
  const list = await request('GET', '/api/tracking-links', null, token);
  if (list.status !== 200) {
    throw new Error('GET tracking-links failed: ' + list.status);
  }

  const byName = new Map((list.body.data || []).map((item) => [item.name, item]));
  let created = 0;
  let reused = 0;

  for (const entry of payload.entries) {
    const existing = byName.get(entry.tracking_name);
    if (existing) {
      entry.code = existing.code;
      entry.ref_url = 'http://xn--61-6kc3bbqgrrd.xn--p1ai/go/' + existing.code;
      entry.tracking_id = existing.id;
      reused += 1;
      continue;
    }

    const made = await request('POST', '/api/tracking-links', {
      name: entry.tracking_name,
      target_url: '/',
    }, token);

    if (made.status !== 200 || !made.body.data || !made.body.data.code) {
      throw new Error('POST tracking-links failed: ' + made.status + ' ' + JSON.stringify(made.body));
    }

    entry.code = made.body.data.code;
    entry.ref_url = 'http://xn--61-6kc3bbqgrrd.xn--p1ai/go/' + made.body.data.code;
    entry.tracking_id = made.body.data.id;
    created += 1;
  }

  payload.refs_created_at = new Date().toISOString();
  payload.created = created;
  payload.reused = reused;
  fs.writeFileSync('/tmp/june_procurement_refs_created.json', JSON.stringify(payload, null, 2));
  console.log(JSON.stringify({ entries: payload.entries.length, created, reused }));
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
