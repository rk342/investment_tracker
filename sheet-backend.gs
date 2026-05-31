// Google Apps Script backend for AlphaAgent persistence using Google Sheets.
// Deploy this as a Web App and use the endpoint URL in constants.js.

const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID';
const BACKEND_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
const ALLOWED_BACKEND_EMAILS = [
  'rkochhar@gmail.com',
  'rekha.kochhar@gmail.com'
];

function doGet(e) {
  return jsonResponse({ message: 'Use POST with id_token to load/save app data.' });
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents || '{}');
  const idToken = (body.id_token || '').toString();
  const email = verifyIdToken(idToken);
  if (!email) {
    return jsonResponse({ error: 'Unauthorized or invalid token.' }, 401);
  }

  if (ALLOWED_BACKEND_EMAILS.indexOf(email.toLowerCase()) === -1) {
    return jsonResponse({ error: 'Email not authorized.' }, 403);
  }

  const action = (body.action || 'load').toString();
  const data = body.data || {};

  if (action === 'load') {
    return jsonResponse(loadUserData(email));
  }

  if (action === 'save') {
    return jsonResponse(saveUserData(email, data));
  }

  return jsonResponse({ error: 'Unsupported action.' }, 400);
}

function verifyIdToken(idToken) {
  if (!idToken) return null;
  try {
    const tokenInfoUrl = 'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken);
    const resp = UrlFetchApp.fetch(tokenInfoUrl, { muteHttpExceptions: true });
    const payload = JSON.parse(resp.getContentText());
    if (payload.aud !== BACKEND_CLIENT_ID) return null;
    if (payload.email_verified !== 'true' && payload.email_verified !== true) return null;
    return payload.email ? payload.email.toString().toLowerCase() : null;
  } catch (err) {
    return null;
  }
}

function getSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheets()[0];
  if (!sheet) {
    sheet = ss.insertSheet('UserData');
    sheet.appendRow(['email', 'holdings', 'watchlist', 'updated']);
  }
  return sheet;
}

function loadUserData(email) {
  const sheet = getSheet();
  const values = sheet.getDataRange().getValues();
  for (let row = 1; row < values.length; row++) {
    if (values[row][0].toString().toLowerCase() === email) {
      return {
        holdings: safeParse(values[row][1]),
        watchlist: safeParse(values[row][2]),
        updated: values[row][3] || ''
      };
    }
  }
  return { holdings: [], watchlist: [] };
}

function saveUserData(email, data) {
  const sheet = getSheet();
  const values = sheet.getDataRange().getValues();
  const holdingsJson = JSON.stringify(data.holdings || []);
  const watchlistJson = JSON.stringify(data.watchlist || []);
  const timestamp = new Date().toISOString();

  for (let row = 1; row < values.length; row++) {
    if (values[row][0].toString().toLowerCase() === email) {
      sheet.getRange(row + 1, 2, 1, 3).setValues([[holdingsJson, watchlistJson, timestamp]]);
      return { success: true, updated: timestamp };
    }
  }

  sheet.appendRow([email, holdingsJson, watchlistJson, timestamp]);
  return { success: true, updated: timestamp };
}

function safeParse(value) {
  if (!value) return [];
  try {
    return JSON.parse(value);
  } catch (err) {
    return [];
  }
}

function jsonResponse(payload, status = 200) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON)
    .setResponseCode(status);
}
