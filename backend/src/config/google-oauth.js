import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// SHEETS (Service Account)  ✅ stable for Render
// ============================================================================

function readServiceAccountCredentials() {
  // 1) Production (Render): paste JSON into env var
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (raw && raw.trim()) {
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_JSON (must be valid JSON).');
    }
  }

  // 2) Local fallback: file on disk
  const keyPath =
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH ||
    path.join(__dirname, '../../google-credentials.json');

  if (!fs.existsSync(keyPath)) {
    throw new Error(
      `Service account credentials not found.\n` +
        `Set GOOGLE_SERVICE_ACCOUNT_JSON (recommended for Render) or provide google-credentials.json.\n` +
        `Tried: ${keyPath}`
    );
  }

  return JSON.parse(fs.readFileSync(keyPath, 'utf8'));
}

export function getServiceAccountAuth() {
  const credentials = readServiceAccountCredentials();

  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}

export async function getSheetsClient() {
  const auth = getServiceAccountAuth();
  return google.sheets({ version: 'v4', auth });
}

// ============================================================================
// DRIVE (OAuth)  ⚠️ file-based tokens (works locally; Render needs persistence)
// ============================================================================

const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive',
];

export function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      'Missing OAuth credentials. Please set:\n' +
        '  - GOOGLE_CLIENT_ID\n' +
        '  - GOOGLE_CLIENT_SECRET\n' +
        '  - GOOGLE_REDIRECT_URI'
    );
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function generateAuthUrl() {
  const oauth2Client = getOAuth2Client();

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: DRIVE_SCOPES,
    prompt: 'consent',
  });
}

export async function getTokensFromCode(code) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

function getTokenPath() {
  return (
    process.env.OAUTH_TOKEN_PATH || path.join(__dirname, '../../oauth-tokens.json')
  );
}

export function saveTokens(tokens) {
  const tokenPath = getTokenPath();
  fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));
  console.log('✅ OAuth tokens saved successfully');
}

export function loadTokens() {
  const tokenPath = getTokenPath();
  if (!fs.existsSync(tokenPath)) return null;
  return JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
}

export function isAuthenticated() {
  const tokens = loadTokens();
  return Boolean(tokens && tokens.refresh_token);
}

export function getAuthenticatedClient() {
  const oauth2Client = getOAuth2Client();
  const tokens = loadTokens();

  if (!tokens || !tokens.refresh_token) {
    throw new Error('Not authenticated for Drive. Please visit /auth/login.');
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
  const auth = getAuthenticatedClient();
  return google.drive({ version: 'v3', auth });
}

// ============================================================================
// CONFIG VALIDATION
// ============================================================================

export function validateConfig() {
  const required = [
    'GOOGLE_SHEETS_PROPERTIES_ID',
    'GOOGLE_SHEETS_REPORTS_ID',
    'GOOGLE_DRIVE_FOLDER_ID',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REDIRECT_URI',
  ];

  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(
      `Missing required environment variables:\n` +
        missing.map((k) => `  - ${k}`).join('\n')
    );
  }

  // Sheets creds check
  const hasEnvJson = Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim());
  const keyPath =
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-credentials.json';
  if (!hasEnvJson && !fs.existsSync(keyPath)) {
    console.warn('⚠️  Sheets service account credentials not found. Sheets will fail.');
  }

  // Drive tokens check
  const tokenPath = process.env.OAUTH_TOKEN_PATH || './oauth-tokens.json';
  if (!fs.existsSync(tokenPath)) {
    console.warn('⚠️  oauth-tokens.json not found. Drive will fail until you authenticate.');
  }
}
