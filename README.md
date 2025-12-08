# VisitProp - Property Inspection Report System

A mobile-first web application for property inspectors to submit detailed property reports. The system integrates with Google Sheets for property database management and Google Drive for file storage.

## Features

- **Mobile-First Design**: Optimized for phone screens with large touch targets and intuitive layout
- **Property Search**: Fast, searchable property selection with ~1000 properties
- **Editable Address Fields**: Auto-filled from database but editable by inspectors
- **Photo Upload**: Support for multiple photos with camera/gallery integration
- **Dynamic Findings**: Add multiple findings with text descriptions and photos
- **Dynamic Actions**: Track actions taken during inspection
- **RTL Support**: Bilingual interface (Arabic/English) with RTL layout support
- **Form Validation**: Client-side validation with helpful error messages
- **Responsive Design**: Works on phones, tablets, and desktops

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **Styling**: Custom CSS with mobile-first approach
- **Backend Integration**: REST API (Google Sheets + Google Drive)

## Project Structure

```
VisitProp/
├── src/
│   ├── components/
│   │   ├── PropertySearch.tsx       # Property search & selection
│   │   ├── PropertySearch.css
│   │   ├── PhotoUpload.tsx          # Photo upload component
│   │   ├── PhotoUpload.css
│   │   ├── FindingsList.tsx         # Dynamic findings list
│   │   ├── FindingsList.css
│   │   ├── ActionsList.tsx          # Dynamic actions list
│   │   ├── ActionsList.css
│   │   ├── PropertyReportForm.tsx   # Main form component
│   │   └── PropertyReportForm.css
│   ├── types.ts                     # TypeScript type definitions
│   ├── api.ts                       # API service layer
│   ├── utils.ts                     # Utility functions
│   ├── App.tsx                      # Root component
│   ├── App.css
│   ├── main.tsx                     # Application entry point
│   ├── index.css                    # Global styles
│   └── vite-env.d.ts               # Vite environment types
├── index.html                       # HTML entry point
├── package.json                     # Dependencies
├── tsconfig.json                    # TypeScript configuration
├── vite.config.ts                   # Vite configuration
└── README.md                        # This file
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Backend API server (for Google Sheets/Drive integration)

### Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd VisitProp
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment variables**

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and set your API base URL:

```
VITE_API_BASE_URL=http://localhost:8080/api
```

4. **Start development server**

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Backend API Requirements

The frontend expects a REST API with the following endpoints:

### 1. Search Properties

**GET** `/api/properties?search=<query>`

Search for properties by name or code.

**Query Parameters:**
- `search` (string): Search query (property name or code)

**Response:**
```json
{
  "properties": [
    {
      "id": "123",
      "code": "843",
      "name": "Property Name",
      "road": "Main Street",
      "block": "Block A",
      "area": "Downtown",
      "governorate": "Capital",
      "defaultLocationLink": "https://maps.google.com/..."
    }
  ],
  "total": 1
}
```

### 2. Upload File

**POST** `/api/upload`

Upload a file to Google Drive.

**Request Body (multipart/form-data):**
- `file`: File to upload
- `propertyCode`: Property code for organizing files

**Response:**
```json
{
  "url": "https://drive.google.com/...",
  "filename": "photo_20240101_123456.jpg"
}
```

### 3. Submit Report

**POST** `/api/reports`

Submit a complete property report.

**Request Body (JSON):**
```json
{
  "propertyId": "123",
  "propertyCode": "843",
  "propertyName": "Property Name",
  "road": "Main Street",
  "area": "Downtown",
  "governorate": "Capital",
  "block": "Block A",
  "locationDescription": "Near the mall",
  "locationLink": "https://maps.google.com/...",
  "mainPhotos": [
    {
      "localId": "...",
      "uploadedUrl": "https://drive.google.com/..."
    }
  ],
  "visitType": "Routine",
  "complaint": "Water leak",
  "findings": [
    {
      "id": "...",
      "text": "Found leak in bathroom",
      "photos": [...]
    }
  ],
  "actions": [
    {
      "id": "...",
      "text": "Called plumber"
    }
  ],
  "corrector": "John Doe",
  "submittedAt": "2024-01-01T12:00:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "reportId": "report_123",
  "message": "Report submitted successfully"
}
```

## Development Notes

### Mobile-First Approach

- All touch targets are minimum 44x44px
- Font size 16px+ to prevent zoom on iOS
- Single-column layout for easy scrolling
- Optimized for one-handed use

### Photo Handling

- Photos create preview URLs using `URL.createObjectURL()`
- Photos are uploaded before report submission
- EXIF data (timestamp) should be extracted by backend
- Supports both camera and gallery selection

### Form Validation

- Property selection is required
- Visit type and complaint are required
- At least one main photo is required
- Location link must be valid URL format
- All findings/actions must have descriptions

### Browser Support

- Modern browsers (Chrome, Safari, Firefox, Edge)
- iOS Safari 14+
- Chrome Android 90+

## Customization

### Styling

All styling is in CSS files with CSS variables defined in `src/index.css`. Key variables:

```css
--primary: #2563eb;
--spacing-md: 1rem;
--radius-md: 0.5rem;
--touch-target: 44px;
```

### Adding Fields

1. Add field to `PropertyReport` type in `src/types.ts`
2. Add state in `PropertyReportForm.tsx`
3. Add input element in form
4. Update validation if needed

## Troubleshooting

### Photos not uploading

- Check API endpoint `/api/upload` is working
- Verify file size limits on backend
- Check network connection

### Search not working

- Verify API endpoint `/api/properties` is accessible
- Check CORS configuration on backend
- Verify search query is being sent correctly

### Form not submitting

- Open browser console for error messages
- Check all required fields are filled
- Verify API endpoint `/api/reports` is working

## License

[Your License Here]

## Support

For issues and questions, please contact [Your Contact Info]
