# OAuth 2.0 Setup Guide for Personal Google Account

This guide shows you how to set up OAuth 2.0 authentication for VisitProp, perfect for **personal Gmail accounts**.

---

## ✅ Why OAuth 2.0?

OAuth 2.0 is the standard method for apps to access your personal Google Drive and Sheets:

✔️ Works with personal Gmail accounts
✔️ Works with "My Drive" (no need for Shared Drives)
✔️ No quota issues
✔️ Full access to your Google Drive and Sheets
✔️ One-time authentication - backend stores the refresh token

---

## 📝 Setup Steps (10-15 minutes)

### **Step 1: Create OAuth 2.0 Credentials**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. In the left sidebar, go to **APIs & Services** → **Credentials**
4. Click **"Create Credentials"** → **"OAuth client ID"**

5. **Configure OAuth consent screen** (if you haven't already):
   - Click **"Configure Consent Screen"**
   - Choose **"External"** (for personal accounts)
   - Click **"Create"**

   **App Information:**
   - App name: `VisitProp`
   - User support email: Your email
   - Developer contact: Your email
   - Click **"Save and Continue"**

   **Scopes:**
   - Click **"Add or Remove Scopes"**
   - Add these scopes:
     - `.../auth/spreadsheets` (Google Sheets API)
     - `.../auth/drive.file` (Google Drive API - Files)
     - `.../auth/drive` (Google Drive API - Full)
   - Click **"Update"** then **"Save and Continue"**

   **Test users:**
   - Click **"Add Users"**
   - Add your Gmail address
   - Click **"Save and Continue"**

   Click **"Back to Dashboard"**

6. **Create OAuth Client ID:**
   - Go back to **Credentials**
   - Click **"Create Credentials"** → **"OAuth client ID"**
   - Application type: **"Web application"**
   - Name: `VisitProp Backend`

   **Authorized redirect URIs:**
   - Click **"Add URI"**
   - Add: `http://localhost:8080/auth/callback`
   - (For production, also add your production URL)

   - Click **"Create"**

7. **Download Credentials:**
   - A popup appears with your Client ID and Client Secret
   - **Copy both values** - you'll need them in the next step!

---

### **Step 2: Configure Your Backend**

1. Open your backend `.env` file:
   ```bash
   cd /home/user/VisitProp/backend
   nano .env
   ```

2. Update it with these values:
   ```env
   # Server Configuration
   PORT=8080
   NODE_ENV=production

   # Google Sheets Configuration
   GOOGLE_SHEETS_PROPERTIES_ID=1zm_S3m3swMQdaQYVrdIcmQ9C0ym7VWY3NHX-WXiCsng
   PROPERTIES_SHEET_NAME=Properties

   GOOGLE_SHEETS_REPORTS_ID=1puw5NP_PH_KTj4Jj3w3-fXAPeNh8NcwgAAlF8f2eYFc
   REPORTS_SHEET_NAME=Reports

   # Google Drive Configuration
   GOOGLE_DRIVE_FOLDER_ID=1YgzdkWVJBAlqut3v650SlWT96cITSWQd

   # OAuth 2.0 Configuration
   GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
   GOOGLE_REDIRECT_URI=http://localhost:8080/auth/callback

   # CORS Configuration
   FRONTEND_URL=http://localhost:3000

   # Optional
   DEBUG=false
   ```

3. **Replace** `YOUR_CLIENT_ID_HERE` and `YOUR_CLIENT_SECRET_HERE` with the values from Step 1

4. Save the file (Ctrl+X, Y, Enter)

---

### **Step 3: Ensure APIs are Enabled**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Go to **APIs & Services** → **Library**
3. Search for and enable these APIs:
   - **Google Sheets API** - Click "Enable"
   - **Google Drive API** - Click "Enable"

---

### **Step 4: Start the Backend**

```bash
cd /home/user/VisitProp/backend
npm start
```

You should see:
```
🚀 ========================================
✅ VisitProp Backend Server is running!
📍 URL: http://localhost:8080
========================================
```

---

### **Step 5: Authenticate Your Google Account**

1. **Open your browser** and go to:
   ```
   http://localhost:8080/auth/login
   ```

2. Click **"Sign in with Google"**

3. **Google Login Page** appears:
   - Choose your Gmail account
   - Click **"Continue"**

4. **Grant Permissions:**
   - Google will ask for permissions to access Sheets and Drive
   - Review the permissions
   - Click **"Allow"**

5. **Success!**
   - You'll be redirected back to a success page
   - Your backend is now authenticated!

---

### **Step 6: Verify Everything Works**

Test the API:

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

Now test searching properties:
```bash
curl "http://localhost:8080/api/properties?search=test"
```

---

## 🎯 What Just Happened?

1. **OAuth Flow:**
   - You logged in with Google
   - Google gave your backend a **refresh token**
   - The token was saved to `oauth-tokens.json`

2. **Token Storage:**
   - `oauth-tokens.json` contains your refresh token
   - The backend uses this to access your Drive and Sheets
   - The token refreshes automatically when needed

3. **Security:**
   - The token file is in `.gitignore` (never committed)
   - Only your backend can use the token
   - You can revoke access anytime from [Google Account Settings](https://myaccount.google.com/permissions)

---

## 🔄 How It Works Now

### Every API Request:

1. Frontend calls backend (e.g., `GET /api/properties?search=843`)
2. Backend loads `oauth-tokens.json`
3. Backend uses your token to access Google Sheets
4. Returns data to frontend

### Token Refresh:

- Access tokens expire after 1 hour
- Backend automatically refreshes them using the refresh token
- You don't need to log in again!

---

## 🛠️ Troubleshooting

### "OAuth credentials not configured"

**Fix:** Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to `.env`

### "Not authenticated" error

**Fix:** Go to `http://localhost:8080/auth/login` and sign in

### "Access blocked: This app's request is invalid"

**Fix:**
1. Check that redirect URI in Google Cloud Console matches: `http://localhost:8080/auth/callback`
2. Make sure you added your email as a test user in the OAuth consent screen

### "Invalid grant" error

**Fix:**
1. Delete `oauth-tokens.json`
2. Go to `http://localhost:8080/auth/login` and sign in again

### Can't access sheets after authentication

**Fix:**
1. Make sure the Google Sheets are in **your account** (not someone else's)
2. If sheets are shared with you, make sure you have edit access

---

## 🔐 Security Best Practices

1. **Never commit `oauth-tokens.json`** (already in `.gitignore`)
2. **Never commit `.env`** (already in `.gitignore`)
3. **Keep your Client Secret private**
4. **For production:**
   - Use environment variables instead of `.env` file
   - Add production redirect URI to Google Cloud Console
   - Use HTTPS for all endpoints

---

## 🚀 For Production Deployment

When deploying to a server:

1. **Update OAuth redirect URI** in Google Cloud Console:
   ```
   https://your-domain.com/auth/callback
   ```

2. **Update `.env` on server:**
   ```env
   GOOGLE_REDIRECT_URI=https://your-domain.com/auth/callback
   FRONTEND_URL=https://your-frontend-domain.com
   ```

3. **Re-authenticate** by visiting:
   ```
   https://your-domain.com/auth/login
   ```

---

## 📊 Managing Your Sheets

### Properties Sheet Requirements:

**Headers (Row 1):**
```
id | code | name | road | block | area | governorate | defaultLocationLink
```

**Ownership:**
- Sheet must be in **your Google account** (the one you authenticated with)
- Or shared with you with **Editor** permissions

### Reports Sheet Requirements:

**Headers (Row 1):**
```
reportId | submittedAt | propertyId | propertyCode | propertyName | road | area | governorate | block | locationDescription | locationLink | visitType | complaint | mainPhotosCount | mainPhotosUrls | findingsCount | findings | actionsCount | actions | corrector | inspectorName
```

### Drive Folder Requirements:

- Must be in **your Google Drive**
- No need to share it (you own it!)

---

## 🆘 Need Help?

### View Authentication Status:
```
http://localhost:8080/auth/status
```

### Re-authenticate:
```
http://localhost:8080/auth/login
```

### Revoke Access:

1. Go to [Google Account Permissions](https://myaccount.google.com/permissions)
2. Find "VisitProp"
3. Click "Remove Access"
4. Re-authenticate: `http://localhost:8080/auth/login`

---

## ✅ Checklist

Before you start the app, make sure:

- [x] OAuth Client ID and Secret added to `.env`
- [x] Google Sheets API enabled
- [x] Google Drive API enabled
- [x] Backend started (`npm start`)
- [x] Visited `/auth/login` and signed in
- [x] `/auth/status` shows `"authenticated": true`
- [x] Your Google Sheets are in your account
- [x] Your Drive folder is in your account

---

**You're all set! Your personal Google account is now connected to VisitProp! 🎉**
