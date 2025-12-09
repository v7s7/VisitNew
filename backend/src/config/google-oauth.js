import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * OAuth 2.0 Scopes needed
 */
const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive'
];

/**
 * Get OAuth2 client
 */
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

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  return oauth2Client;
}

/**
 * Generate authentication URL
 */
export function generateAuthUrl() {
  const oauth2Client = getOAuth2Client();

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent' // Force to get refresh token
  });

  return authUrl;
}

/**
 * Get tokens from authorization code
 */
export async function getTokensFromCode(code) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Save tokens to file
 */
export function saveTokens(tokens) {
  const tokenPath = process.env.OAUTH_TOKEN_PATH ||
                    path.join(__dirname, '../../oauth-tokens.json');

  fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));
  console.log('✅ OAuth tokens saved successfully');
}

/**
 * Load tokens from file
 */
export function loadTokens() {
  const tokenPath = process.env.OAUTH_TOKEN_PATH ||
                    path.join(__dirname, '../../oauth-tokens.json');

  if (!fs.existsSync(tokenPath)) {
    return null;
  }

  const tokens = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
  return tokens;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
  const tokens = loadTokens();
  return tokens && tokens.refresh_token;
}

/**
 * Get authenticated Google API client
 */
export function getAuthenticatedClient() {
  const oauth2Client = getOAuth2Client();
  const tokens = loadTokens();

  if (!tokens || !tokens.refresh_token) {
    throw new Error(
      'Not authenticated. Please visit /auth/login to authenticate with Google.'
    );
  }

  oauth2Client.setCredentials(tokens);

  // Auto-refresh access token when needed
  oauth2Client.on('tokens', (newTokens) => {
    if (newTokens.refresh_token) {
      tokens.refresh_token = newTokens.refresh_token;
    }
    tokens.access_token = newTokens.access_token;
    tokens.expiry_date = newTokens.expiry_date;
    saveTokens(tokens);
  });

  return oauth2Client;
}

/**
 * Get authenticated Google Sheets client
 */
export async function getSheetsClient() {
  const auth = getAuthenticatedClient();
  const sheets = google.sheets({ version: 'v4', auth });
  return sheets;
}

/**
 * Get authenticated Google Drive client
 */
export async function getDriveClient() {
  const auth = getAuthenticatedClient();
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
    'GOOGLE_DRIVE_FOLDER_ID',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REDIRECT_URI'
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
