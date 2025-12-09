import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

console.log('🔍 Testing VisitProp Backend Setup\n');
console.log('=====================================\n');

// Test 1: Check .env file
console.log('✓ Checking .env file...');
if (fs.existsSync('.env')) {
  console.log('  ✅ .env file exists');
} else {
  console.log('  ❌ .env file NOT found');
  process.exit(1);
}

// Test 2: Check required environment variables
console.log('\n✓ Checking environment variables...');
const required = [
  'GOOGLE_SHEETS_PROPERTIES_ID',
  'GOOGLE_SHEETS_REPORTS_ID',
  'GOOGLE_DRIVE_FOLDER_ID'
];

let allPresent = true;
for (const key of required) {
  if (process.env[key]) {
    console.log(`  ✅ ${key}: ${process.env[key]}`);
  } else {
    console.log(`  ❌ ${key}: MISSING`);
    allPresent = false;
  }
}

if (!allPresent) {
  console.log('\n❌ Some environment variables are missing!');
  process.exit(1);
}

// Test 3: Check credentials file
console.log('\n✓ Checking Google credentials file...');
const credPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-credentials.json';
if (fs.existsSync(credPath)) {
  console.log(`  ✅ Credentials file exists: ${credPath}`);

  try {
    const creds = JSON.parse(fs.readFileSync(credPath, 'utf8'));
    console.log(`  ✅ Service Account Email: ${creds.client_email}`);
    console.log(`  ✅ Project ID: ${creds.project_id}`);
  } catch (error) {
    console.log(`  ❌ Invalid JSON in credentials file`);
    process.exit(1);
  }
} else {
  console.log(`  ❌ Credentials file NOT found: ${credPath}`);
  console.log('\n⚠️  You need to download google-credentials.json from Google Cloud Console');
  console.log('   and place it in the backend/ folder.\n');
  process.exit(1);
}

// Test 4: Try to connect to Google APIs
console.log('\n✓ Testing Google API connection...');
try {
  const { google } = await import('googleapis');
  const credentials = JSON.parse(fs.readFileSync(credPath, 'utf8'));

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive'
    ]
  });

  const authClient = await auth.getClient();
  console.log('  ✅ Authentication successful!');

  // Test Sheets API
  console.log('\n✓ Testing Properties Sheet access...');
  const sheets = google.sheets({ version: 'v4', auth });

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_PROPERTIES_ID,
      range: 'Properties!A1:H1',
    });

    const headers = response.data.values?.[0] || [];
    console.log(`  ✅ Properties Sheet accessible`);
    console.log(`  ✅ Column headers: ${headers.join(', ')}`);

    // Verify headers
    const expectedHeaders = ['id', 'code', 'name', 'road', 'block', 'area', 'governorate', 'defaultLocationLink'];
    const headersMatch = expectedHeaders.every((h, i) => h === headers[i]);

    if (headersMatch) {
      console.log('  ✅ Column headers are correct!');
    } else {
      console.log('  ⚠️  Column headers do not match expected format');
      console.log(`     Expected: ${expectedHeaders.join(', ')}`);
    }

  } catch (error) {
    console.log('  ❌ Cannot access Properties Sheet');
    console.log(`     Error: ${error.message}`);
    console.log('\n  Make sure:');
    console.log(`  1. Sheet ID is correct: ${process.env.GOOGLE_SHEETS_PROPERTIES_ID}`);
    console.log(`  2. Sheet is shared with: ${credentials.client_email}`);
    console.log('  3. Service account has Editor permission\n');
  }

  // Test Reports Sheet
  console.log('\n✓ Testing Reports Sheet access...');
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_REPORTS_ID,
      range: 'Reports!A1:U1',
    });

    console.log('  ✅ Reports Sheet accessible');
    const headers = response.data.values?.[0] || [];
    console.log(`  ✅ Found ${headers.length} columns`);

  } catch (error) {
    console.log('  ❌ Cannot access Reports Sheet');
    console.log(`     Error: ${error.message}`);
    console.log('\n  Make sure:');
    console.log(`  1. Sheet ID is correct: ${process.env.GOOGLE_SHEETS_REPORTS_ID}`);
    console.log(`  2. Sheet is shared with: ${credentials.client_email}`);
    console.log('  3. Service account has Editor permission\n');
  }

  // Test Drive folder
  console.log('\n✓ Testing Google Drive folder access...');
  const drive = google.drive({ version: 'v3', auth });

  try {
    const response = await drive.files.get({
      fileId: process.env.GOOGLE_DRIVE_FOLDER_ID,
      fields: 'id, name, mimeType'
    });

    console.log(`  ✅ Drive folder accessible: ${response.data.name}`);

  } catch (error) {
    console.log('  ❌ Cannot access Drive folder');
    console.log(`     Error: ${error.message}`);
    console.log('\n  Make sure:');
    console.log(`  1. Folder ID is correct: ${process.env.GOOGLE_DRIVE_FOLDER_ID}`);
    console.log(`  2. Folder is shared with: ${credentials.client_email}`);
    console.log('  3. Service account has Editor permission\n');
  }

} catch (error) {
  console.log(`  ❌ Error: ${error.message}`);
}

console.log('\n=====================================');
console.log('✅ Setup test complete!\n');
console.log('If all tests passed, you can start the server with:');
console.log('  npm start\n');
