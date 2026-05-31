require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const db = require('./db');

const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS || '')
  .split(',')
  .map(email => email.trim().toLowerCase())
  .filter(Boolean);

if (!SESSION_SECRET || !GOOGLE_CLIENT_ID) {
  throw new Error('Missing required environment variables: SESSION_SECRET, GOOGLE_CLIENT_ID');
}

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname)));

async function verifyIdToken(token) {
  const ticket = await googleClient.verifyIdToken({ idToken: token, audience: GOOGLE_CLIENT_ID });
  const payload = ticket.getPayload();
  if (!payload || !payload.email || payload.email_verified !== true) {
    return null;
  }
  return payload;
}

function createSessionToken(user) {
  return jwt.sign({ email: user.email, name: user.name, sub: user.google_id }, SESSION_SECRET, { expiresIn: '8h' });
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token.' });
  }
  try {
    req.user = jwt.verify(token, SESSION_SECRET);
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

app.post('/api/auth', async (req, res) => {
  const { id_token: idToken } = req.body || {};
  if (!idToken) {
    return res.status(400).json({ error: 'Missing id_token.' });
  }

  try {
    const payload = await verifyIdToken(idToken);
    if (!payload) {
      return res.status(401).json({ error: 'Invalid Google ID token.' });
    }

    const email = payload.email.toLowerCase();
    if (ALLOWED_EMAILS.length && !ALLOWED_EMAILS.includes(email)) {
      return res.status(403).json({ error: 'Email is not authorized.' });
    }

    const user = db.upsertUser({
      email,
      name: payload.name || '',
      picture: payload.picture || '',
      sub: payload.sub || ''
    });
    db.saveAuthToken(user.id, 'google_id_token', idToken);

    const token = createSessionToken(user);
    return res.json({ token, user: { email: user.email, name: user.name, picture: user.picture } });
  } catch (err) {
    console.error('Auth error', err);
    return res.status(500).json({ error: 'Unable to verify Google token.' });
  }
});

app.get('/api/user', authMiddleware, (req, res) => {
  const user = db.getUserByEmail(req.user.email);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }
  const appData = db.getAppData(user.id);
  return res.json({ user: { email: user.email, name: user.name, picture: user.picture }, ...appData });
});

app.post('/api/user', authMiddleware, (req, res) => {
  const user = db.getUserByEmail(req.user.email);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }
  const { holdings = [], watchlist = [] } = req.body || {};
  const result = db.saveAppData(user.id, { holdings, watchlist });
  return res.json(result);
});

const server = app.listen(PORT, () => {
  console.log(`Backend service listening on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop the existing server or change PORT in .env.`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});
