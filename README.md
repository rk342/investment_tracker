# AlphaAgent — AI Investment Intelligence

A single-page investment portfolio tracker with AI-powered analysis, options income tracking, and Google authentication.

## Features

- **Portfolio Dashboard** — Track holdings with real-time P&L, signals, and AI-per-position analysis
- **AI Analyst Chat** — Powered by Claude (Anthropic API); ask for trade ideas, covered calls, hedges, and more
- **Income Tracker** — Monitor covered calls, cash-secured puts, and wheel strategy positions
- **Watchlist** — Track tickers with notes and one-click AI deep-dives
- **Performance Charts** — Monthly returns vs 2% target, portfolio allocation donut chart
- **Google Authentication** — OAuth 2.0 sign-in gates access to the app

## Setup

### 1. Google OAuth (required to access the app)

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create or select a project.
2. Navigate to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**.
3. Set application type to **Web application**.
4. Under **Authorized JavaScript origins**, add the origin you'll serve the file from (e.g. `http://localhost:8080` or your deployed domain). `file://` origins are not supported by Google OAuth.
5. Copy the **Client ID**.
6. Open the app, click **Google Setup** in the header, paste the Client ID, and click **Save Client ID**.
7. Click **Sign in with Google**.

### 2. Anthropic API Key (required for AI analysis)

1. Get a free key at [console.anthropic.com](https://console.anthropic.com).
2. Click **API Key** in the app header and paste your key.

Both credentials are stored only in your browser's `localStorage` and are never sent to any third-party server.

## Running Locally

Because Google OAuth requires an HTTP/HTTPS origin, open the file via a local server rather than directly in the browser:

```bash
# Python
python3 -m http.server 8080

# Node.js (npx)
npx serve .
```

Then open `http://localhost:8080` in your browser.

### 3. Google Sheets backend (optional)

1. Open [Google Apps Script](https://script.google.com/) and create a new project.
2. Paste the contents of `sheet-backend.gs` into the script editor.
3. Set `SPREADSHEET_ID` to the ID of a Google Sheet you create for persistence.
4. Set `BACKEND_CLIENT_ID` to the same OAuth client ID you saved for Google sign-in.
5. Deploy the script as a **Web App**. Choose **Execute as: Me** and **Who has access: Anyone** or **Anyone with Google account**.
6. Copy the Web App URL and paste it into `SHEETS_BACKEND_URL` inside `constants.js`.
7. Reload the app and sign in. Your holdings and watchlist will now persist to Google Sheets.

> Note: `constants.js` is intentionally ignored by Git; this means your backend URL and client token stay local.

## Project Structure

```
investment_tracker/
├── index.html       # Entire application (HTML, CSS, JS)
├── constants.js     # Local config: OAuth IDs, backend URL, allowed users
├── config.js        # Runtime feature flags (e.g. disable Google sign-in)
├── sheet-backend.gs # Google Apps Script backend for Google Sheets persistence
└── .gitignore       # Local-only files ignored by Git
```

## Tech Stack

| Dependency | Purpose |
|---|---|
| [Google Identity Services](https://developers.google.com/identity/gsi/web) | OAuth 2.0 authentication |
| [Anthropic Claude API](https://console.anthropic.com) | AI investment analysis |
| [Chart.js 4](https://www.chartjs.org/) | Performance and allocation charts |
| [Tabler Icons](https://tabler.io/icons) | UI icons |
| [Google Fonts — DM Sans / IBM Plex Mono](https://fonts.google.com/) | Typography |

## Usage Notes

- Holdings, watchlist entries, and options positions are held **in memory only** — they reset on page refresh. Persistence via localStorage or a backend can be added separately.
- All AI analysis calls go directly from your browser to `api.anthropic.com`. No backend server is required.
- The app is for **educational purposes only** and does not constitute financial advice.

## Authentication Flow

1. On load, the app reads any cached Google user profile from `localStorage`.
2. If no session exists, the app locks (nav/content hidden) and shows the sign-in gate.
3. After successful Google sign-in, the credential JWT is parsed client-side to extract name, email, and avatar.
4. The app checks the signed-in email against a hard-coded allowlist. Only authorized email addresses may sign in.
5. Signing out clears the session and revokes the Google token.

## Authorized Users

To restrict access, update the `ALLOWED_EMAILS` array in `index.html` with the exact authorized Google email addresses.

```js
const ALLOWED_EMAILS = [
  'alice@example.com',
  'bob@example.com'
];
```
