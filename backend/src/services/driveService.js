import { getDriveClient } from '../config/google-hybrid.js';
import { format } from 'date-fns';
import { Readable } from 'stream';

/**
 * Folder Structure in Google Drive:
 *
 * Main Folder (GOOGLE_DRIVE_FOLDER_ID)
 * └── "315, محل تجاري, " (Code, PropertyType, EndowedTo) ← ALWAYS REUSED
 *     └── "2025-12-10" ← ONE date folder per day, ALWAYS REUSED
 *         ├── الصور الرئيسية/ ← all main photos
 *         ├── ملفات البلاغ/ ← all complaint files
 *         ├── Exports/ ← generated pdf + zip
 *         ├── Finding 1 - broken door/ ← all photos for finding 1
 *         └── Finding 2 - cracked wall/ ← all photos for finding 2
 *
 * Notes:
 * - Property folder: ALWAYS REUSED (same property = same folder)
 * - Date folder: ALWAYS REUSED (same day = same folder, NO versioning)
 * - Finding numbers: AUTO-DETECTED (scan existing, continue numbering)
 */

const EXPORTS_FOLDER_NAME = 'Exports';

/**
 * Get or create a folder in Google Drive
 * @param {boolean} allowReuse - If false, will create new folder even if one exists
 */
async function getOrCreateFolder(parentFolderId, folderName, allowReuse = true) {
  const drive = await getDriveClient();

  // Escape single quotes in folder name for query
  const escapedFolderName = folderName.replace(/'/g, "\\'");

  // Search for existing folder
  const query = `name='${escapedFolderName}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;

  const searchResponse = await drive.files.list({
    q: query,
    fields: 'files(id, name, webViewLink)',
    spaces: 'drive',
  });

  if (searchResponse.data.files && searchResponse.data.files.length > 0 && allowReuse) {
    console.log(`   ♻️  Reusing existing folder: ${folderName}`);
    return {
      id: searchResponse.data.files[0].id,
      webViewLink: searchResponse.data.files[0].webViewLink,
    };
  }

  console.log(`   📁 Creating new folder: ${folderName}`);
  const folderMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [parentFolderId],
  };

  const createResponse = await drive.files.create({
    requestBody: folderMetadata,
    fields: 'id, name, webViewLink',
  });

  return {
    id: createResponse.data.id,
    webViewLink: createResponse.data.webViewLink,
  };
}

/**
 * Get the next available finding number
 * Scans existing "Finding N - ..." folders and returns next N
 */
async function getNextFindingNumber(dateFolderId) {
  const drive = await getDriveClient();

  const query = `'${dateFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;

  const searchResponse = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (!searchResponse.data.files || searchResponse.data.files.length === 0) return 1;

  const findingNumbers = [];
  const findingPattern = /^Finding (\d+) - /;

  searchResponse.data.files.forEach((file) => {
    const match = file.name.match(findingPattern);
    if (match) findingNumbers.push(parseInt(match[1], 10));
  });

  if (findingNumbers.length === 0) return 1;
  return Math.max(...findingNumbers) + 1;
}

/**
 * Sanitize folder name to be safe for Google Drive
 */
function sanitizeFolderName(name) {
  return name.replace(/[/<>:"|?*\\]/g, '-').trim();
}

/**
 * Get organized folder path IDs
 * Creates/Reuses: Main/[Code, PropertyType, EndowedTo]/YYYY-MM-DD/(subfolder)
 *
 * For findings: frontend sends "Finding 1 - X" and backend assigns next number.
 */
async function getOrganizedFolderPath(propertyCode, propertyType, endowedTo, subfolder = 'الصور الرئيسية') {
  const mainFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  const today = format(new Date(), 'yyyy-MM-dd');

  // Step 1: Property folder
  const propertyFolderName = sanitizeFolderName(`${propertyCode}, ${propertyType}, ${endowedTo}`);
  const propertyFolder = await getOrCreateFolder(mainFolderId, propertyFolderName);

  // Step 2: Date folder
  const dateFolder = await getOrCreateFolder(propertyFolder.id, today);
  console.log(`   📅 Using date folder: ${today}`);

  // Step 3: Subfolder
  let finalSubfolderName = subfolder;

  const findingMatch = subfolder.match(/^Finding \d+ - (.+)$/);
  if (findingMatch) {
    const description = findingMatch[1];
    const nextNumber = await getNextFindingNumber(dateFolder.id);
    finalSubfolderName = `Finding ${nextNumber} - ${description}`;
    console.log(`   🔍 Creating finding folder: ${finalSubfolderName} (auto-detected next number)`);
  }

  const subFolder = await getOrCreateFolder(dateFolder.id, finalSubfolderName);

  return {
    propertyFolderId: propertyFolder.id,
    dateFolderId: dateFolder.id,
    dateFolderUrl: dateFolder.webViewLink || null,
    subFolderId: subFolder.id,
    subFolderUrl: subFolder.webViewLink || null,
    today,
  };
}

/**
 * Ensure Exports folder exists under the date folder
 */
export async function ensureExportsFolder(propertyCode, propertyType, endowedTo) {
  const { dateFolderId, dateFolderUrl, today } = await getOrganizedFolderPath(
    propertyCode,
    propertyType,
    endowedTo,
    'الصور الرئيسية'
  );

  const exportsFolder = await getOrCreateFolder(dateFolderId, EXPORTS_FOLDER_NAME);
  return {
    exportsFolderId: exportsFolder.id,
    exportsFolderUrl: exportsFolder.webViewLink || null,
    dateFolderId,
    dateFolderUrl,
    today,
  };
}

/**
 * Upload a Buffer to Google Drive (used for generated PDF/ZIP exports)
 */
export async function uploadBufferToDrive(buffer, fileName, mimeType, parentFolderId) {
  const drive = await getDriveClient();

  const sanitizedFileName = String(fileName).replace(/[^a-zA-Z0-9._\u0600-\u06FF\s-]/g, '_');
  const bufferStream = Readable.from(buffer);

  const fileMetadata = {
    name: sanitizedFileName,
    parents: [parentFolderId],
  };

  const media = {
    mimeType,
    body: bufferStream,
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: 'id, name, webViewLink, webContentLink',
  });

  return {
    fileId: response.data.id,
    fileName: response.data.name,
    url: response.data.webViewLink || `https://drive.google.com/file/d/${response.data.id}/view`,
    downloadUrl: response.data.webContentLink || null,
  };
}

/**
 * Upload a file to Google Drive (used for user uploads)
 */
export async function uploadFile(
  fileBuffer,
  fileName,
  mimeType,
  propertyCode,
  propertyType,
  endowedTo,
  subfolder = 'الصور الرئيسية'
) {
  try {
    const drive = await getDriveClient();

    console.log(`   📂 Organizing folder structure...`);
    const { subFolderId } = await getOrganizedFolderPath(propertyCode, propertyType, endowedTo, subfolder);

    const bufferStream = Readable.from(fileBuffer);
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._\u0600-\u06FF\s-]/g, '_');

    console.log(`   ⬆️  Uploading to Google Drive: ${sanitizedFileName}`);
    const fileMetadata = {
      name: sanitizedFileName,
      parents: [subFolderId],
    };

    const media = {
      mimeType,
      body: bufferStream,
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: 'id, name, webViewLink, webContentLink',
    });

    console.log(`   ✓ File uploaded successfully: ${response.data.id}`);

    return {
      fileId: response.data.id,
      fileName: sanitizedFileName,
      url: response.data.webViewLink || `https://drive.google.com/file/d/${response.data.id}/view`,
      downloadUrl: response.data.webContentLink || null,
    };
  } catch (error) {
    console.error('❌ Error uploading file to Google Drive:', error.message);

    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      throw new Error('Network error: Unable to connect to Google Drive. Please check your internet connection.');
    } else if (error.code === 403) {
      throw new Error('Permission denied: Please check your Google Drive credentials and permissions.');
    } else if (error.code === 404) {
      throw new Error('Google Drive folder not found. Please verify your GOOGLE_DRIVE_FOLDER_ID.');
    } else if (error.message?.includes('quota')) {
      throw new Error('Google Drive storage quota exceeded. Please free up space or upgrade your storage.');
    } else {
      throw new Error(`Google Drive upload failed: ${error.message}`);
    }
  }
}

/**
 * Upload multiple files to the same subfolder
 */
export async function uploadMultipleFiles(files, propertyCode, propertyType, endowedTo, subfolder = 'الصور الرئيسية') {
  try {
    const drive = await getDriveClient();

    const uploadPromises = files.map(async (file, index) => {
      console.log(`   [${index + 1}/${files.length}] Uploading: ${file.originalname}`);

      console.log(`   📂 Organizing folder structure for file ${index + 1}...`);
      const { subFolderId } = await getOrganizedFolderPath(propertyCode, propertyType, endowedTo, subfolder);

      const bufferStream = Readable.from(file.buffer);
      const sanitizedFileName = file.originalname.replace(/[^a-zA-Z0-9._\u0600-\u06FF\s-]/g, '_');

      const fileMetadata = {
        name: sanitizedFileName,
        parents: [subFolderId],
      };

      const media = {
        mimeType: file.mimetype,
        body: bufferStream,
      };

      const response = await drive.files.create({
        requestBody: fileMetadata,
        media,
        fields: 'id, name, webViewLink, webContentLink',
      });

      console.log(`   ✓ [${index + 1}/${files.length}] ${sanitizedFileName} uploaded`);

      return {
        fileId: response.data.id,
        fileName: sanitizedFileName,
        url: response.data.webViewLink || `https://drive.google.com/file/d/${response.data.id}/view`,
        downloadUrl: response.data.webContentLink || null,
      };
    });

    const results = await Promise.all(uploadPromises);
    console.log(`   ✓ All ${results.length} files uploaded to ${subfolder}`);
    return results;
  } catch (error) {
    console.error(`   ❌ Error during batch upload: ${error.message}`);
    throw error;
  }
}

/**
 * Get folder structure for a property (best-effort)
 * Note: your property folder name is "code, type, endowedTo", so searching by code alone may not match.
 */
export async function getPropertyFolderStructure(propertyCode) {
  try {
    const drive = await getDriveClient();
    const mainFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    const escaped = String(propertyCode).replace(/'/g, "\\'");
    const query = `name contains '${escaped}' and '${mainFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;

    const response = await drive.files.list({
      q: query,
      fields: 'files(id, name, webViewLink)',
      spaces: 'drive',
    });

    if (response.data.files && response.data.files.length > 0) {
      return {
        exists: true,
        folderId: response.data.files[0].id,
        folderUrl: response.data.files[0].webViewLink,
        folderName: response.data.files[0].name,
      };
    }

    return { exists: false };
  } catch (error) {
    console.error('Error getting folder structure:', error.message);
    throw new Error('Failed to get folder structure');
  }
}
