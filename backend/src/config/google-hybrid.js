import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * HYBRID AUTHENTICATION APPROACH
 *
 * - Service Account → Google Sheets (Properties & Reports)
 * - OAuth 2.0 → Google Drive (Uploads + reading files for ZIP exports)
 *
 * Notes:
 * - drive scope must allow downloading files we created (drive.file is OK if the app created the files)
 * - we use OAuth tokens saved locally in oauth-tokens.json
 */

// ============================================================================
// SERVICE ACCOUNT (for Google Sheets)
// ============================================================================

export function getServiceAccountAuth() {
  const keyPath =
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || path.join(__dirname, '../../google-credentials.json');

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
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return auth;
}

export async function getSheetsClient() {
  const auth = getServiceAccountAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  return sheets;
}

// ============================================================================
// OAUTH 2.0 (for Google Drive)
// ============================================================================

// Keep drive scope because we need folder listing + file download for ZIP exports.
// If you want least privilege, you can attempt drive.file only, but listing existing folders and
// downloading files not created by this app can fail. For now, keep both as you had.
const OAUTH_SCOPES = ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'];

export function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      'Missing OAuth credentials. Please set:\n' +
        '  - GOOGLE_CLIENT_ID\n' +
        '  - GOOGLE_CLIENT_SECRET\n' +
        '  - GOOGLE_REDIRECT_URI\n' +
        'in your .env file'
    );
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  return oauth2Client;
}

export function generateAuthUrl() {
  const oauth2Client = getOAuth2Client();

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: OAUTH_SCOPES,
    prompt: 'consent',
  });
}

export async function getTokensFromCode(code) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export function saveTokens(tokens) {
  const tokenPath = process.env.OAUTH_TOKEN_PATH || path.join(__dirname, '../../oauth-tokens.json');
  fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));
  console.log('✅ OAuth tokens saved successfully');
}

export function loadTokens() {
  const tokenPath = process.env.OAUTH_TOKEN_PATH || path.join(__dirname, '../../oauth-tokens.json');
  if (!fs.existsSync(tokenPath)) return null;
  return JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
}

export function isAuthenticated() {
  const tokens = loadTokens();
  return Boolean(tokens && tokens.refresh_token);
}

export function getAuthenticatedOAuthClient() {
  const oauth2Client = getOAuth2Client();
  const tokens = loadTokens();

  if (!tokens || !tokens.refresh_token) {
    throw new Error('Not authenticated for Drive. Please visit /auth/login to authenticate with Google.');
  }

  oauth2Client.setCredentials(tokens);

  oauth2Client.on('tokens', (newTokens) => {
    const merged = { ...tokens };

    if (newTokens.refresh_token) merged.refresh_token = newTokens.refresh_token;
    if (newTokens.access_token) merged.access_token = newTokens.access_token;
    if (newTokens.expiry_date) merged.expiry_date = newTokens.expiry_date;
    if (newTokens.scope) merged.scope = newTokens.scope;
    if (newTokens.token_type) merged.token_type = newTokens.token_type;

    saveTokens(merged);
  });

  return oauth2Client;
}

export async function getDriveClient() {
  const auth = getAuthenticatedOAuthClient();
  const drive = google.drive({ version: 'v3', auth });
  return drive;
}

/**
 * Validate configuration
 */
export function validateConfig() {
  const required = [
    'GOOGLE_SHEETS_PROPERTIES_ID',
    'GOOGLE_SHEETS_REPORTS_ID',
    'GOOGLE_DRIVE_FOLDER_ID',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REDIRECT_URI',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n` +
        missing.map((key) => `  - ${key}`).join('\n') +
        '\n\nPlease check your .env file.'
    );
  }

  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-credentials.json';
  if (!fs.existsSync(keyPath)) {
    console.warn('⚠️  Warning: google-credentials.json not found. Google Sheets access will fail.');
  }

  const tokenPath = process.env.OAUTH_TOKEN_PATH || './oauth-tokens.json';
  if (!fs.existsSync(tokenPath)) {
    console.warn('⚠️  Warning: oauth-tokens.json not found. Drive access will fail until you authenticate.');
  }
}
