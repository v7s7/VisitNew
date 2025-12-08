import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initialize Google API authentication
 * Uses service account for server-to-server authentication
 */
export function getGoogleAuth() {
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH ||
                  path.join(__dirname, '../../google-credentials.json');

  if (!fs.existsSync(keyPath)) {
    throw new Error(
      `Google credentials file not found at: ${keyPath}\n` +
      'Please download your service account key from Google Cloud Console\n' +
      'and save it as google-credentials.json in the backend folder.'
    );
  }

  const credentials = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive'
    ]
  });

  return auth;
}

/**
 * Get authenticated Google Sheets client
 */
export async function getSheetsClient() {
  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  return sheets;
}

/**
 * Get authenticated Google Drive client
 */
export async function getDriveClient() {
  const auth = getGoogleAuth();
  const drive = google.drive({ version: 'v3', auth });
  return drive;
}

/**
 * Validate Google Sheets configuration
 */
export function validateConfig() {
  const required = [
    'GOOGLE_SHEETS_PROPERTIES_ID',
    'GOOGLE_SHEETS_REPORTS_ID',
    'GOOGLE_DRIVE_FOLDER_ID'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n` +
      missing.map(key => `  - ${key}`).join('\n') +
      '\n\nPlease check your .env file.'
    );
  }
}
