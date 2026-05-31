const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATABASE_FILE = process.env.DATABASE_FILE || path.join(__dirname, 'data.json');
const ENCRYPTION_KEY = process.env.SESSION_SECRET;
if (!ENCRYPTION_KEY) {
  throw new Error('SESSION_SECRET is required to encrypt OAuth tokens.');
}

const DEFAULT_STORE = {
  users: [],
  appData: [],
  authTokens: []
};

function loadStore() {
  try {
    if (!fs.existsSync(DATABASE_FILE)) {
      fs.writeFileSync(DATABASE_FILE, JSON.stringify(DEFAULT_STORE, null, 2));
    }
    const content = fs.readFileSync(DATABASE_FILE, 'utf8');
    return JSON.parse(content || '{}');
  } catch (err) {
    console.warn('Failed to load storage file:', err);
    return JSON.parse(JSON.stringify(DEFAULT_STORE));
  }
}

function saveStore(store) {
  fs.writeFileSync(DATABASE_FILE, JSON.stringify(store, null, 2));
}

function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', crypto.createHash('sha256').update(ENCRYPTION_KEY).digest(), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

function decrypt(encrypted) {
  try {
    const data = Buffer.from(encrypted, 'base64');
    const iv = data.slice(0, 12);
    const tag = data.slice(12, 28);
    const ciphertext = data.slice(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', crypto.createHash('sha256').update(ENCRYPTION_KEY).digest(), iv);
    decipher.setAuthTag(tag);
    return decipher.update(ciphertext, null, 'utf8') + decipher.final('utf8');
  } catch (err) {
    return null;
  }
}

function getUserByEmail(email) {
  const store = loadStore();
  return store.users.find(user => user.email === email.toLowerCase()) || null;
}

function upsertUser(user) {
  const store = loadStore();
  const email = user.email.toLowerCase();
  const now = new Date().toISOString();
  let existing = store.users.find(u => u.email === email);
  if (existing) {
    existing.name = user.name || existing.name;
    existing.picture = user.picture || existing.picture;
    existing.google_id = user.sub || existing.google_id;
    existing.updated_at = now;
  } else {
    existing = {
      id: store.users.length ? Math.max(...store.users.map(u => u.id)) + 1 : 1,
      email,
      name: user.name || '',
      picture: user.picture || '',
      google_id: user.sub || '',
      created_at: now,
      updated_at: now
    };
    store.users.push(existing);
  }
  saveStore(store);
  return existing;
}

function getAppData(userId) {
  const store = loadStore();
  const entry = store.appData.find(item => item.user_id === userId);
  if (!entry) {
    return { holdings: [], watchlist: [] };
  }
  return {
    holdings: safeParse(entry.holdings),
    watchlist: safeParse(entry.watchlist)
  };
}

function saveAppData(userId, data) {
  const store = loadStore();
  const now = new Date().toISOString();
  const entry = store.appData.find(item => item.user_id === userId);
  const payload = {
    user_id: userId,
    holdings: JSON.stringify(data.holdings || []),
    watchlist: JSON.stringify(data.watchlist || []),
    updated_at: now
  };
  if (entry) {
    entry.holdings = payload.holdings;
    entry.watchlist = payload.watchlist;
    entry.updated_at = now;
  } else {
    store.appData.push(payload);
  }
  saveStore(store);
  return { success: true, updated_at: now };
}

function saveAuthToken(userId, tokenType, tokenValue) {
  const store = loadStore();
  const now = new Date().toISOString();
  const encrypted = encrypt(tokenValue);
  const entry = store.authTokens.find(item => item.user_id === userId && item.token_type === tokenType);
  if (entry) {
    entry.token_value = encrypted;
    entry.updated_at = now;
  } else {
    store.authTokens.push({ user_id: userId, token_type: tokenType, token_value: encrypted, updated_at: now });
  }
  saveStore(store);
}

function getAuthToken(userId, tokenType) {
  const store = loadStore();
  const entry = store.authTokens.find(item => item.user_id === userId && item.token_type === tokenType);
  return entry ? decrypt(entry.token_value) : null;
}

function safeParse(value) {
  if (!value) return [];
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

module.exports = {
  getUserByEmail,
  upsertUser,
  getAppData,
  saveAppData,
  saveAuthToken,
  getAuthToken
};
