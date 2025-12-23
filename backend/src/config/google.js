import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readServiceAccountCredentials() {
  // Preferred for Render/production
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (raw && raw.trim()) {
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_JSON (must be valid JSON).');
    }
  }

  // Local dev fallback (file)
  const keyPath =
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH ||
    path.join(__dirname, '../../google-credentials.json');

  if (!fs.existsSync(keyPath)) {
    throw new Error(
      `Google credentials not found.\n` +
        `Set GOOGLE_SERVICE_ACCOUNT_JSON (recommended for Render), or provide google-credentials.json locally.\n` +
        `Tried: ${keyPath}`
    );
  }

  return JSON.parse(fs.readFileSync(keyPath, 'utf8'));
}

/**
 * Initialize Google API authentication
 * Uses service account for server-to-server authentication
 */
export function getGoogleAuth() {
  const credentials = readServiceAccountCredentials();

  return new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive',
    ],
  });
}

/**
 * Get authenticated Google Sheets client
 */
export async function getSheetsClient() {
  const auth = getGoogleAuth();
  return google.sheets({ version: 'v4', auth });
}

/**
 * Get authenticated Google Drive client
 */
export async function getDriveClient() {
  const auth = getGoogleAuth();
  return google.drive({ version: 'v3', auth });
}

/**
 * Validate configuration
 */
export function validateConfig() {
  const required = [
    'GOOGLE_SHEETS_PROPERTIES_ID',
    'GOOGLE_SHEETS_REPORTS_ID',
    'GOOGLE_DRIVE_FOLDER_ID',
  ];

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n` +
        missing.map((key) => `  - ${key}`).join('\n')
    );
  }

  const hasEnvJson = Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim());
  const keyPath =
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-credentials.json';

  if (!hasEnvJson && !fs.existsSync(keyPath)) {
    console.warn(
      '⚠️  Warning: No service account credentials found. Set GOOGLE_SERVICE_ACCOUNT_JSON on Render.'
    );
  }
}
