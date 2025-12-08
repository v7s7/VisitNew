# Google Cloud Setup Guide

This guide will walk you through setting up Google Cloud services for the VisitProp backend.

---

## 📋 What You'll Set Up

1. **Google Cloud Project** - Container for all your resources
2. **Service Account** - Authentication for the backend
3. **Google Sheets API** - To read properties and write reports
4. **Google Drive API** - To upload and organize files
5. **Two Google Sheets** - One for properties, one for reports
6. **One Google Drive Folder** - To organize uploaded files

---

## ⏱️ Estimated Time: 15-20 minutes

---

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click **"New Project"**
4. Enter project name: `VisitProp` (or any name you like)
5. Click **"Create"**
6. Wait for the project to be created (~30 seconds)
7. Make sure your new project is selected (check the project dropdown)

---

## Step 2: Enable Required APIs

### Enable Google Sheets API

1. In the search bar at the top, type **"Google Sheets API"**
2. Click on **"Google Sheets API"** from the results
3. Click the **"Enable"** button
4. Wait for it to enable (~10 seconds)

### Enable Google Drive API

1. In the search bar, type **"Google Drive API"**
2. Click on **"Google Drive API"** from the results
3. Click the **"Enable"** button
4. Wait for it to enable (~10 seconds)

---

## Step 3: Create a Service Account

A service account is like a "robot user" that your backend will use to access Google services.

1. In the left sidebar, click **"IAM & Admin"** → **"Service Accounts"**
   - Or search for "Service Accounts" in the top search bar

2. Click **"Create Service Account"** at the top

3. Fill in the details:
   - **Service account name**: `visitprop-backend`
   - **Service account ID**: (auto-filled, leave as is)
   - **Description**: `Backend service for VisitProp property reports`

4. Click **"Create and Continue"**

5. **Grant this service account access to project** (optional step):
   - Click **"Continue"** (skip this step)

6. Click **"Done"**

---

## Step 4: Create and Download Service Account Key

This is the credentials file your backend will use.

1. You should see your new service account in the list
2. Click on the service account email (looks like `visitprop-backend@...`)
3. Click on the **"Keys"** tab
4. Click **"Add Key"** → **"Create new key"**
5. Choose **"JSON"** format
6. Click **"Create"**
7. A JSON file will download automatically - **SAVE THIS FILE CAREFULLY!**
8. Rename the file to **`google-credentials.json`**
9. Move it to your `backend/` folder:
   ```
   VisitProp/
   └── backend/
       └── google-credentials.json  ← Put it here
   ```

⚠️ **IMPORTANT**: Never share this file or commit it to git! It contains sensitive credentials.

---

## Step 5: Create Google Sheets

You need two Google Sheets: one for properties and one for reports.

### Create Properties Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Click **"Blank"** to create a new sheet
3. Name it: **"VisitProp Properties Database"**
4. In the first row, add these column headers exactly:

   | A | B | C | D | E | F | G | H |
   |---|---|---|---|---|---|---|---|
   | id | code | name | road | block | area | governorate | defaultLocationLink |

5. Add some sample data (example):

   | A | B | C | D | E | F | G | H |
   |---|---|---|---|---|---|---|---|
   | id | code | name | road | block | area | governorate | defaultLocationLink |
   | 1 | 843 | عقار النخيل السكني | طريق الملك فهد | مجمع أ | المنامة | محافظة العاصمة | https://maps.google.com/?q=26.2285,50.5860 |
   | 2 | 844 | عقار الورود التجاري | شارع البديع | مجمع ب | المحرق | محافظة المحرق | https://maps.google.com/?q=26.2540,50.6130 |

6. Copy the **Sheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/THIS_IS_THE_SHEET_ID/edit
                                          ^^^^^^^^^^^^^^^^^^^^
   ```
   Save this ID - you'll need it for the .env file!

### Create Reports Sheet

1. Create another new Google Sheet
2. Name it: **"VisitProp Reports"**
3. In the first row, add these column headers exactly:

   | A | B | C | D | E | F | G | H | I | J | K | L | M | N | O | P | Q | R | S | T | U |
   |---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
   | reportId | submittedAt | propertyId | propertyCode | propertyName | road | area | governorate | block | locationDescription | locationLink | visitType | complaint | mainPhotosCount | mainPhotosUrls | findingsCount | findings | actionsCount | actions | corrector | inspectorName |

4. Copy the **Sheet ID** from the URL (same as above)
   Save this ID too!

---

## Step 6: Share Sheets with Service Account

Your backend needs permission to access these sheets.

For **BOTH sheets** (Properties and Reports):

1. Click the **"Share"** button (top right)
2. In the "Add people and groups" field, paste your **service account email**
   - It looks like: `visitprop-backend@your-project.iam.gserviceaccount.com`
   - You can find it in the `google-credentials.json` file (look for `client_email`)
3. Set permission to **"Editor"**
4. **Uncheck** "Notify people" (no need to send email to a service account)
5. Click **"Share"**

✅ Now your backend can read and write to these sheets!

---

## Step 7: Create Google Drive Folder

This folder will store all uploaded photos organized by property.

1. Go to [Google Drive](https://drive.google.com)
2. Click **"New"** → **"Folder"**
3. Name it: **"VisitProp Uploads"**
4. Click **"Create"**
5. Right-click on the folder → **"Share"**
6. Add your **service account email** (same as step 6)
7. Set permission to **"Editor"**
8. **Uncheck** "Notify people"
9. Click **"Share"**
10. Open the folder and copy the **Folder ID** from the URL:
    ```
    https://drive.google.com/drive/folders/THIS_IS_THE_FOLDER_ID
                                           ^^^^^^^^^^^^^^^^^^^^
    ```
    Save this ID!

---

## Step 8: Configure Backend Environment

Now you have all the IDs you need! Let's configure the backend.

1. Go to `backend/` folder
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

3. Open `.env` and fill in your values:

```env
# Server Configuration
PORT=8080
NODE_ENV=production

# Google Sheets Configuration
GOOGLE_SHEETS_PROPERTIES_ID=YOUR_PROPERTIES_SHEET_ID_HERE
PROPERTIES_SHEET_NAME=Properties

GOOGLE_SHEETS_REPORTS_ID=YOUR_REPORTS_SHEET_ID_HERE
REPORTS_SHEET_NAME=Reports

# Google Drive Configuration
GOOGLE_DRIVE_FOLDER_ID=YOUR_DRIVE_FOLDER_ID_HERE

# Google Service Account
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./google-credentials.json

# CORS Configuration
FRONTEND_URL=http://localhost:3000

# Optional
DEBUG=false
```

4. Replace these values:
   - `YOUR_PROPERTIES_SHEET_ID_HERE` → Properties Sheet ID from Step 5
   - `YOUR_REPORTS_SHEET_ID_HERE` → Reports Sheet ID from Step 5
   - `YOUR_DRIVE_FOLDER_ID_HERE` → Drive Folder ID from Step 7

5. Save the file

---

## Step 9: Test Your Setup

1. Make sure `google-credentials.json` is in the `backend/` folder
2. Make sure `.env` is configured with all IDs
3. Install dependencies:
   ```bash
   cd backend
   npm install
   ```

4. Start the server:
   ```bash
   npm start
   ```

5. You should see:
   ```
   🚀 ========================================
   ✅ VisitProp Backend Server is running!
   📍 URL: http://localhost:8080
   ========================================

   🔗 Connected Services:
      📊 Properties Sheet: YOUR_SHEET_ID
      📋 Reports Sheet: YOUR_SHEET_ID
      📁 Drive Folder: YOUR_FOLDER_ID

   ✨ Ready to accept requests!
   ```

6. Test the API:
   ```bash
   curl http://localhost:8080/api/health
   ```

---

## ✅ You're Done!

Your backend is now connected to:
- ✅ Google Sheets for property database
- ✅ Google Sheets for storing reports
- ✅ Google Drive for file uploads

---

## 🔒 Security Best Practices

1. **Never commit `google-credentials.json`** to git (already in .gitignore)
2. **Never commit `.env`** to git (already in .gitignore)
3. **Keep your service account key safe** - treat it like a password
4. **Don't share your Sheet IDs publicly** if they contain sensitive data
5. **For production**: Use environment variables instead of .env file

---

## 🐛 Troubleshooting

### "Credentials file not found"
- Make sure `google-credentials.json` is in the `backend/` folder
- Check the filename is exactly `google-credentials.json`

### "Failed to fetch properties from database"
- Make sure you shared the Properties Sheet with the service account
- Check the Sheet ID in `.env` is correct
- Make sure the sheet has the correct column headers

### "Failed to save report to database"
- Make sure you shared the Reports Sheet with the service account
- Check the Sheet ID in `.env` is correct
- Make sure the sheet has the correct column headers

### "Failed to upload file to Google Drive"
- Make sure you shared the Drive folder with the service account
- Check the Folder ID in `.env` is correct

### "Missing required environment variables"
- Check all IDs are filled in `.env`
- Make sure there are no extra spaces or quotes around the IDs

---

## 📚 Next Steps

1. Add more properties to your Properties Sheet
2. Start the frontend and test the full flow
3. Check the Reports Sheet and Drive folder after submitting a report
4. See `DEPLOYMENT.md` for production deployment instructions

---

## 📞 Need Help?

If you encounter issues:
1. Check the server logs for error messages
2. Verify all IDs are correct in `.env`
3. Make sure service account has access to all sheets and folders
4. Check that all APIs are enabled in Google Cloud Console

---

**You're all set! Your backend is ready to use! 🎉**
