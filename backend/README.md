# VisitProp Backend

Backend server for VisitProp property inspection system with Google Sheets and Google Drive integration.

## 🌟 Features

- **Google Sheets Integration** - Read properties and store reports
- **Google Drive Integration** - Upload and organize files automatically
- **RESTful API** - Clean API for frontend communication
- **Organized File Storage** - Automatic folder structure by property and date
- **Error Handling** - Comprehensive error handling and logging
- **CORS Support** - Configured for frontend communication

## 📋 Prerequisites

- Node.js 18+ and npm
- Google Cloud account
- Google Sheets for properties and reports
- Google Drive folder for uploads

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Set Up Google Cloud

Follow the detailed guide: **[GOOGLE_CLOUD_SETUP.md](./GOOGLE_CLOUD_SETUP.md)**

This will help you:
- Create a Google Cloud project
- Enable required APIs
- Create a service account
- Download credentials
- Set up Google Sheets and Drive

### 3. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and fill in your values:

```env
GOOGLE_SHEETS_PROPERTIES_ID=your-properties-sheet-id
GOOGLE_SHEETS_REPORTS_ID=your-reports-sheet-id
GOOGLE_DRIVE_FOLDER_ID=your-drive-folder-id
```

### 4. Add Service Account Credentials

Place your `google-credentials.json` file in the `backend/` directory.

### 5. Set Up Google Sheets

Use the templates in **[SHEETS_TEMPLATES.md](./SHEETS_TEMPLATES.md)** to set up your sheets correctly.

### 6. Start the Server

```bash
npm start
```

You should see:

```
🚀 ========================================
✅ VisitProp Backend Server is running!
📍 URL: http://localhost:8080
========================================
```

### 7. Test the API

```bash
curl http://localhost:8080/api/health
```

## 📡 API Endpoints

### Health Check

```
GET /api/health
```

Returns server status and available endpoints.

### Properties

#### Search Properties
```
GET /api/properties?search=<query>
```

**Query Parameters:**
- `search` - Search term (property name, code, or area)

**Response:**
```json
{
  "properties": [
    {
      "id": "1",
      "code": "843",
      "name": "عقار النخيل السكني",
      "road": "طريق الملك فهد",
      "block": "مجمع أ",
      "area": "المنامة",
      "governorate": "محافظة العاصمة",
      "defaultLocationLink": "https://maps.google.com/..."
    }
  ],
  "total": 1
}
```

#### Get Property by ID
```
GET /api/properties/:id
```

### File Upload

#### Upload Single File
```
POST /api/upload
Content-Type: multipart/form-data

Fields:
- file: File to upload
- propertyCode: Property code for organization
- subfolder: (optional) "main" or "findings" (default: "main")
```

**Response:**
```json
{
  "success": true,
  "url": "https://drive.google.com/file/...",
  "filename": "1705320000_photo.jpg",
  "fileId": "abc123..."
}
```

#### Upload Multiple Files
```
POST /api/upload/multiple
Content-Type: multipart/form-data

Fields:
- files: Array of files to upload
- propertyCode: Property code for organization
- subfolder: (optional) "main" or "findings" (default: "main")
```

### Reports

#### Submit Report
```
POST /api/reports
Content-Type: application/json

Body: {
  "propertyId": "1",
  "propertyCode": "843",
  "propertyName": "عقار النخيل",
  "road": "طريق الملك فهد",
  "area": "المنامة",
  "governorate": "محافظة العاصمة",
  "block": "مجمع أ",
  "locationDescription": "Near the mall",
  "locationLink": "https://maps.google.com/...",
  "visitType": "Routine",
  "complaint": "Water leak",
  "mainPhotos": [
    {
      "uploadedUrl": "https://drive.google.com/..."
    }
  ],
  "findings": [
    {
      "text": "Found leak in bathroom",
      "photos": [...]
    }
  ],
  "actions": [
    {
      "text": "Called plumber"
    }
  ],
  "corrector": "John Doe",
  "submittedAt": "2024-01-15T12:00:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "reportId": "REPORT_1705320000_abc123",
  "message": "Report submitted successfully"
}
```

#### Get All Reports
```
GET /api/reports
```

#### Get Reports by Property
```
GET /api/reports?propertyCode=843
```

#### Get Report by ID
```
GET /api/reports/:id
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── google.js          # Google API configuration
│   ├── services/
│   │   ├── propertiesService.js   # Properties database logic
│   │   ├── reportsService.js      # Reports storage logic
│   │   └── driveService.js        # File upload logic
│   ├── controllers/
│   │   ├── propertiesController.js
│   │   ├── uploadController.js
│   │   └── reportsController.js
│   ├── routes/
│   │   └── index.js           # API routes
│   └── server.js              # Main server file
├── google-credentials.json    # Service account key (not in git)
├── .env                       # Environment variables (not in git)
├── .env.example               # Environment template
├── package.json
├── GOOGLE_CLOUD_SETUP.md      # Setup guide
├── SHEETS_TEMPLATES.md        # Google Sheets templates
└── README.md                  # This file
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `8080` |
| `NODE_ENV` | Environment | `production` or `development` |
| `GOOGLE_SHEETS_PROPERTIES_ID` | Properties Sheet ID | `1abc...xyz` |
| `PROPERTIES_SHEET_NAME` | Properties sheet name | `Properties` |
| `GOOGLE_SHEETS_REPORTS_ID` | Reports Sheet ID | `1def...uvw` |
| `REPORTS_SHEET_NAME` | Reports sheet name | `Reports` |
| `GOOGLE_DRIVE_FOLDER_ID` | Drive folder ID | `1ghi...rst` |
| `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` | Path to credentials | `./google-credentials.json` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` |
| `DEBUG` | Enable debug logging | `false` |

### Google Drive Folder Structure

Files are automatically organized:

```
Main Folder/
└── {propertyCode}/
    └── {date}/
        ├── main/           # Main photos
        └── findings/       # Finding photos
```

Example:
```
VisitProp Uploads/
└── 843/
    └── 2024-01-15/
        ├── main/
        │   ├── 1705320000_photo1.jpg
        │   └── 1705320001_photo2.jpg
        └── findings/
            └── 1705320002_finding1.jpg
```

## 🔒 Security

- Service account credentials are not committed to git (`.gitignore`)
- Environment variables are not committed to git (`.gitignore`)
- CORS is configured to only allow specified frontend URL
- File uploads limited to 10MB
- Only image files are accepted for upload

## 🐛 Troubleshooting

### "Credentials file not found"

- Make sure `google-credentials.json` is in the `backend/` folder
- Check `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` in `.env`

### "Failed to fetch properties"

- Verify Properties Sheet ID in `.env`
- Check service account has Editor access to the sheet
- Verify column headers match the template

### "Failed to save report"

- Verify Reports Sheet ID in `.env`
- Check service account has Editor access to the sheet
- Verify column headers match the template

### "Failed to upload file"

- Verify Drive Folder ID in `.env`
- Check service account has Editor access to the folder
- Check file size is under 10MB

### "Missing required environment variables"

- Copy `.env.example` to `.env`
- Fill in all required IDs
- No extra spaces or quotes around values

## 📊 Monitoring

The server logs include:

- Request logging (method, path, timestamp)
- Search queries and result counts
- File upload details
- Report submission confirmations
- Error messages with details

Example logs:
```
2024-01-15T12:00:00.000Z GET /api/properties
🔍 Search: "843" - Found 1 properties
📤 Uploaded: photo.jpg → 1705320000_photo.jpg
   Property: 843 | Subfolder: main
✅ Report saved to Google Sheet: REPORT_1705320000_abc123
   Property: عقار النخيل (843)
```

## 🚀 Deployment

For production deployment:

1. Use environment variables instead of `.env` file
2. Set `NODE_ENV=production`
3. Use a process manager like PM2
4. Set up HTTPS/SSL
5. Configure firewall rules
6. Set up monitoring and alerts

See deployment platform documentation for specific instructions.

## 📝 Scripts

```bash
npm start       # Start the server
npm run dev     # Start with auto-reload (Node --watch)
```

## 📚 Documentation

- **[GOOGLE_CLOUD_SETUP.md](./GOOGLE_CLOUD_SETUP.md)** - Complete Google Cloud setup guide
- **[SHEETS_TEMPLATES.md](./SHEETS_TEMPLATES.md)** - Google Sheets templates and reference

## 🤝 Contributing

When making changes:

1. Test with the mock frontend
2. Verify Google Sheets updates correctly
3. Check file uploads work
4. Update documentation if needed

## 📄 License

[Your License Here]

---

**For setup help, see [GOOGLE_CLOUD_SETUP.md](./GOOGLE_CLOUD_SETUP.md)**
