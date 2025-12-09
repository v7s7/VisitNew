# Hybrid Authentication Setup Guide

The **best of both worlds** approach! 🎉

## 🎯 Architecture

```
┌─────────────────────────────────────────────┐
│  Service Account → Google Sheets            │
│  (Properties & Reports data)                │
│  ✅ Simple sharing, no personal login       │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  OAuth 2.0 → Google Drive                   │
│  (File uploads to your personal Drive)      │
│  ✅ Works with "My Drive", one-time login   │
└─────────────────────────────────────────────┘
```

## ✅ Why This Approach?

| What | Uses | Why |
|------|------|-----|
| **Google Sheets** (Properties & Reports) | Service Account | • Easy to share sheets<br>• No personal login needed<br>• Reliable for data operations |
| **Google Drive** (File uploads) | OAuth 2.0 | • Access your "My Drive"<br>• No sharing hassles<br>• Works with personal accounts |

---

## 🚀 Quick Setup (15 minutes)

### Step 1: Create Service Account (for Sheets)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **IAM & Admin** → **Service Accounts**
4. Click **"Create Service Account"**
   - Name: `visitprop-sheets`
   - Description: `Service account for Google Sheets access`
5. Click **"Create and Continue"** → **"Done"**
6. Click on the service account
7. Go to **"Keys"** tab → **"Add Key"** → **"Create new key"** → **JSON**
8. Download and save as `google-credentials.json` in `backend/` folder
9. **Copy the service account email** (looks like: `visitprop-sheets@...iam.gserviceaccount.com`)

### Step 2: Share Google Sheets with Service Account

**Properties Sheet:**
1. Open: https://docs.google.com/spreadsheets/d/1zm_S3m3swMQdaQYVrdIcmQ9C0ym7VWY3NHX-WXiCsng
2. Click **"Share"**
3. Paste the service account email
4. Set permission to **"Editor"**
5. Uncheck "Notify people"
6. Click **"Share"**

**Reports Sheet:**
1. Open: https://docs.google.com/spreadsheets/d/1puw5NP_PH_KTj4Jj3w3-fXAPeNh8NcwgAAlF8f2eYFc
2. Repeat the same sharing steps

✅ **Done with Sheets!** Service account can now read/write your sheets.

---

### Step 3: Create OAuth Credentials (for Drive)

1. Still in [Google Cloud Console](https://console.cloud.google.com/)
2. Go to **APIs & Services** → **Credentials**
3. Click **"Create Credentials"** → **"OAuth client ID"**

4. **Configure OAuth Consent Screen** (if not done):
   - Click **"Configure Consent Screen"**
   - Choose **"External"**
   - App name: `VisitProp`
   - Your email in support email
   - Add your email as test user
   - **Scopes**: Add `auth/drive.file` and `auth/drive`
   - Click **"Save and Continue"**

5. **Create OAuth Client:**
   - Application type: **"Web application"**
   - Name: `VisitProp Backend`
   - **Authorized redirect URIs**: `http://localhost:8080/auth/callback`
   - Click **"Create"**

6. **Copy the Client ID and Client Secret**

---

### Step 4: Enable Required APIs

1. Go to **APIs & Services** → **Library**
2. Search and enable:
   - **Google Sheets API** → Enable
   - **Google Drive API** → Enable

---

### Step 5: Configure Backend

Update your `backend/.env` file:

```env
# Server Configuration
PORT=8080
NODE_ENV=production

# Google Sheets (Service Account)
GOOGLE_SHEETS_PROPERTIES_ID=1zm_S3m3swMQdaQYVrdIcmQ9C0ym7VWY3NHX-WXiCsng
PROPERTIES_SHEET_NAME=Properties

GOOGLE_SHEETS_REPORTS_ID=1puw5NP_PH_KTj4Jj3w3-fXAPeNh8NcwgAAlF8f2eYFc
REPORTS_SHEET_NAME=Reports

GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./google-credentials.json

# Google Drive (OAuth 2.0)
GOOGLE_DRIVE_FOLDER_ID=1YgzdkWVJBAlqut3v650SlWT96cITSWQd

# OAuth Credentials
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET
GOOGLE_REDIRECT_URI=http://localhost:8080/auth/callback

# CORS
FRONTEND_URL=http://localhost:3000
```

**Replace:**
- `YOUR_CLIENT_ID` with OAuth Client ID from Step 3
- `YOUR_CLIENT_SECRET` with OAuth Client Secret from Step 3

---

### Step 6: Create Drive Folder

1. Go to [Google Drive](https://drive.google.com)
2. Create a new folder: **"VisitProp Uploads"**
3. **Copy the folder ID** from the URL:
   ```
   https://drive.google.com/drive/folders/1YgzdkWVJBAlqut3v650SlWT96cITSWQd
                                           ^^^ This is the folder ID ^^^
   ```
4. Already in your `.env` file! ✅

**Note:** No need to share this folder - you'll authenticate with OAuth!

---

### Step 7: Start Backend & Authenticate

1. **Start the backend:**
   ```bash
   cd backend
   npm start
   ```

2. **Open your browser:**
   ```
   http://localhost:8080/auth/login
   ```

3. **Click "Sign in with Google"**

4. **Choose your Gmail account**

5. **Grant permissions** for Drive access

6. **Done!** ✅

---

## ✅ Verification

### Test Sheets Access (Service Account):
```bash
curl "http://localhost:8080/api/properties?search=test"
```

Should return properties from your sheet!

### Test OAuth Status:
```bash
curl http://localhost:8080/auth/status
```

Should return:
```json
{
  "authenticated": true,
  "message": "User is authenticated"
}
```

### Test Drive Access:

Upload will happen automatically when you submit a report with photos.

---

## 📊 What Each Auth Method Does

### Service Account (Sheets):
- ✅ Reads properties from Properties Sheet
- ✅ Writes reports to Reports Sheet
- ✅ No personal login needed
- ✅ Just share the sheets once

### OAuth 2.0 (Drive):
- ✅ Uploads photos to your personal Drive
- ✅ Organizes in folders by property/date
- ✅ One-time authentication
- ✅ Token auto-refreshes

---

## 🔐 Security

### Service Account:
- Credentials in `google-credentials.json` (gitignored)
- Only has access to sheets you explicitly share
- Cannot access your Drive or other files

### OAuth:
- Tokens in `oauth-tokens.json` (gitignored)
- Only has access to Drive (not Sheets)
- You can revoke at any time: [Google Permissions](https://myaccount.google.com/permissions)

---

## 🐛 Troubleshooting

### "Failed to fetch properties"
- ✅ Check `google-credentials.json` exists in `backend/`
- ✅ Verify Properties Sheet is shared with service account email
- ✅ Check Sheet ID in `.env` is correct

### "Failed to upload file"
- ✅ Go to `http://localhost:8080/auth/login` and authenticate
- ✅ Check `/auth/status` shows `authenticated: true`
- ✅ Verify Drive Folder ID in `.env` is correct

### "Access blocked: This app's request is invalid"
- ✅ Check redirect URI in Google Console matches: `http://localhost:8080/auth/callback`
- ✅ Add your email as test user in OAuth consent screen

---

## 📁 File Structure

```
backend/
├── google-credentials.json    ← Service Account (for Sheets)
├── oauth-tokens.json          ← OAuth tokens (for Drive) - auto-generated
├── .env                       ← Your configuration
└── src/
    └── config/
        └── google-hybrid.js   ← Hybrid auth implementation
```

---

## 🎉 Benefits Summary

✅ **Best approach for personal Google accounts**
✅ **Sheets**: Simple service account sharing
✅ **Drive**: Full access to your personal Drive
✅ **No complex Shared Drive setup**
✅ **Secure**: Each service has minimal required permissions
✅ **Reliable**: Two independent auth methods
✅ **Production-ready**: Works on localhost and deployed servers

---

## 📚 Next Steps

1. ✅ Service account created & sheets shared
2. ✅ OAuth credentials created
3. ✅ Backend configured
4. ✅ Backend started
5. ✅ Authenticated via `/auth/login`
6. ✅ Ready to use!

**Your VisitProp backend is now fully configured with hybrid authentication! 🎊**
