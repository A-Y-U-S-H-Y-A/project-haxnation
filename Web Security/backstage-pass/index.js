import express from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;
const FLAG = process.env.FLAG || 'HXN{local_dev_flag_set_FLAG_env}';

// ---------------------------------------------------------------------------
// Signing keys live in ./keys. The default key is generated once at startup so
// it is never shipped in the image. Each pass is signed with it and carries a
// `kid` header telling the verifier which key file to load.
// ---------------------------------------------------------------------------
const KEYS_DIR = path.join(__dirname, 'keys');
if (!fs.existsSync(KEYS_DIR)) fs.mkdirSync(KEYS_DIR, { recursive: true });
const DEFAULT_KEY_PATH = path.join(KEYS_DIR, 'default');
if (!fs.existsSync(DEFAULT_KEY_PATH)) {
  fs.writeFileSync(DEFAULT_KEY_PATH, crypto.randomBytes(32));
}

// Load the signing key named by the token's `kid` header.
function loadKey(kid) {
  // keys are organised by name under KEYS_DIR
  return fs.readFileSync(path.join(KEYS_DIR, kid));
}

function issuePass(name) {
  const key = loadKey('default');
  return jwt.sign(
    { sub: name, role: 'attendee', tier: 'general' },
    key,
    { algorithm: 'HS256', keyid: 'default', expiresIn: '2h' }
  );
}

function verifyPass(token) {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || !decoded.header) throw new Error('malformed pass');
  const kid = decoded.header.kid || 'default';
  const key = loadKey(kid);
  // Only HMAC passes are accepted here.
  return jwt.verify(token, key, { algorithms: ['HS256'] });
}

function bearer(req) {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

// ---- Static portal -------------------------------------------------------
app.use('/static', express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---- API -----------------------------------------------------------------
app.post('/api/register', (req, res) => {
  const name = (req.body && req.body.name) ? String(req.body.name).slice(0, 64) : 'guest';
  const token = issuePass(name);
  res.json({ ok: true, message: `Welcome, ${name}. Here is your attendee pass.`, pass: token });
});

app.get('/api/whoami', (req, res) => {
  const token = bearer(req);
  if (!token) return res.status(401).json({ ok: false, error: 'no pass presented' });
  try {
    const claims = verifyPass(token);
    res.json({ ok: true, claims });
  } catch (err) {
    // NOTE(dev): surface the reason so attendees can tell us what went wrong
    res.status(401).json({ ok: false, error: 'pass rejected', detail: err.message });
  }
});

app.get('/api/backstage', (req, res) => {
  const token = bearer(req);
  if (!token) return res.status(401).json({ ok: false, error: 'no pass presented' });
  let claims;
  try {
    claims = verifyPass(token);
  } catch (err) {
    return res.status(401).json({ ok: false, error: 'pass rejected', detail: err.message });
  }
  if (claims.role !== 'admin') {
    return res.status(403).json({ ok: false, error: 'attendee passes cannot enter backstage' });
  }
  res.json({ ok: true, message: 'Backstage access granted.', flag: FLAG });
});

app.listen(PORT, () => console.log(`Haxnation Backstage listening on :${PORT}`));
