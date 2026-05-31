# Google OAuth 2.0 Setup Guide

This guide walks you through configuring Google OAuth for local development.

## Step 1: Create or Find Your OAuth App in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project (or create a new one)
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. If prompted, configure the OAuth consent screen first:
   - Choose **User Type: Internal** (for development/testing)
   - Fill in the required fields (App name, User support email, etc.)
   - Add scopes: `email`, `profile`, `openid`
   - Add test users: your email address

## Step 2: Create or Update OAuth 2.0 Web Client

1. For **Application type**, select **Web application**
2. Under **Authorized JavaScript origins**, add:
   ```
   http://localhost:3010
   ```
   (Add one origin per line if you have multiple)

3. Under **Authorized redirect URIs**, add:
   ```
   http://localhost:3010
   http://localhost:3010/callback
   ```

4. Click **Create** or **Update**
5. Copy the **Client ID** (looks like: `XXXXXXX-abc123.apps.googleusercontent.com`)

## Step 3: Save Client ID to Your App

### Option A: Via UI (Recommended for first-time setup)
1. Open the app in your browser at `http://localhost:3010`
2. Click **Google Setup** (top-right button)
3. Paste your Client ID into the input field
4. Click **Save Client ID**

### Option B: Manual Configuration
1. Edit `constants.js` and set:
   ```javascript
   const GOOGLE_CLIENT_ID_KEY = 'alphaagent_google_client_id';
   const GOOGLE_USER_KEY = 'alphaagent_google_user';
   const GOOGLE_ID_TOKEN_KEY = 'alphaagent_google_id_token';
   const SESSION_TOKEN_KEY = 'alphaagent_session_token';
   const BACKEND_API_URL = 'http://localhost:3010';
   ```

2. Open browser DevTools (F12) > Console and run:
   ```javascript
   localStorage.setItem('alphaagent_google_client_id', 'YOUR_CLIENT_ID_HERE');
   location.reload();
   ```

## Step 4: Test Sign-In

1. Refresh the app at `http://localhost:3010`
2. The Google sign-in button should appear
3. Click it and sign in with an email in your `ALLOWED_EMAILS` list (from `.env`)
4. You should be redirected to the app dashboard

## Troubleshooting

### Error: "App not verified" or "doesn't comply with Google's OAuth 2.0 policy"
- **Cause**: OAuth app not fully configured or using external user type in restricted mode
- **Fix**: 
  - Ensure OAuth consent screen is set to **User Type: Internal** (not External for dev)
  - Verify `http://localhost:3010` is in **Authorized JavaScript origins**
  - Go to **APIs & Services** > **OAuth consent screen** and check all required fields are filled

### Error: "Redirect URI mismatch"
- **Cause**: Frontend is on a different port than configured
- **Fix**: 
  - Update `BACKEND_API_URL` in `constants.js` to match your actual backend port
  - Add that origin to **Authorized JavaScript origins** in Google Cloud Console

### Sign-in button doesn't appear
- **Cause**: Google Client ID not saved or incorrect
- **Fix**: 
  - Click **Google Setup** button and enter your Client ID
  - Check browser console (F12) for errors
  - Make sure `GOOGLE_CLIENT_ID_KEY` in `constants.js` matches the localStorage key

### "Email is not authorized"
- **Cause**: Email not in the `ALLOWED_EMAILS` list
- **Fix**: 
  - Update `.env` file:
     ```
     ALLOWED_EMAILS=your-email@gmail.com,another-email@gmail.com
     ```
  - Restart backend: `npm start`

## Development Tips

- **Keep it simple**: For local dev, use User Type **Internal** on consent screen
- **Test emails**: Add your test emails to the consent screen's test user list
- **Port consistency**: Ensure `BACKEND_API_URL` in `constants.js` matches your `.env` `PORT`
- **Clear cache**: If issues persist, clear browser localStorage: `localStorage.clear()` in console, then reload

## Security Notes

- **Never commit** your real `GOOGLE_CLIENT_ID` to version control
- **Use .gitignore**: `constants.js` is already ignored
- **Keep `SESSION_SECRET` safe**: Used to sign session tokens
- **Production**: For production, you'll need a more formal OAuth setup with proper redirect URIs

---

For more details, see:
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Identity Services](https://developers.google.com/identity/gsi/web)
