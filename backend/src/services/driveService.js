import { getDriveClient } from '../config/google-hybrid.js';
import { format } from 'date-fns';
import { Readable } from 'stream';

/**
 * Folder Structure in Google Drive:
 *
 * Main Folder (GOOGLE_DRIVE_FOLDER_ID)
 * └── "315, محل تجاري, " (Code, PropertyType, EndowedTo) ← REUSED
 *     ├── "2025-12-10" (First report)
 *     │   ├── الصور الرئيسية/
 *     │   ├── ملفات البلاغ/
 *     │   └── Finding1 - broken door/
 *     ├── "2025-12-10 (2nd)" (Second report - NEW folder)
 *     │   ├── الصور الرئيسية/
 *     │   └── ملفات البلاغ/
 *     └── "2025-12-10 (3rd)" (Third report - NEW folder)
 *         └── الصور الرئيسية/
 *
 * How it works:
 * - Building/Property folder: ALWAYS REUSED
 * - Date folders: NEVER REUSED - each upload creates new versioned folder
 * - If "2025-12-10" exists → creates "2025-12-10 (2nd)" automatically
 * - EACH UPLOAD = NEW DATE FOLDER (prevents overwriting old reports)
 */

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
    fields: 'files(id, name)',
    spaces: 'drive'
  });

  if (searchResponse.data.files && searchResponse.data.files.length > 0 && allowReuse) {
    // Folder exists - reuse it
    console.log(`   ♻️  Reusing existing folder: ${folderName}`);
    return searchResponse.data.files[0].id;
  }

  // Create new folder
  console.log(`   📁 Creating new folder: ${folderName}`);
  const folderMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [parentFolderId]
  };

  const createResponse = await drive.files.create({
    requestBody: folderMetadata,
    fields: 'id, name'
  });

  return createResponse.data.id;
}

/**
 * Find the next available versioned folder name
 * E.g., if "2025-12-10" exists, returns "2025-12-10 (2nd)"
 */
async function getNextVersionedFolderName(parentFolderId, baseName) {
  const drive = await getDriveClient();

  // Search for all folders matching the base pattern
  const escapedBaseName = baseName.replace(/'/g, "\\'");

  // Get all folders that start with the base name
  const query = `'${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;

  const searchResponse = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    spaces: 'drive'
  });

  if (!searchResponse.data.files || searchResponse.data.files.length === 0) {
    // No folders exist, use base name
    return { name: baseName, version: 1 };
  }

  // Find all versions of this date folder
  const versions = [];
  const baseNamePattern = new RegExp(`^${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?: \\((\\d+)(?:st|nd|rd|th)\\))?$`);

  searchResponse.data.files.forEach(file => {
    const match = file.name.match(baseNamePattern);
    if (match) {
      if (match[1]) {
        // It's a numbered version like "2025-12-10 (2nd)"
        versions.push(parseInt(match[1]));
      } else if (file.name === baseName) {
        // It's the base version "2025-12-10"
        versions.push(1);
      }
    }
  });

  if (versions.length === 0) {
    // No matching folders found
    return { name: baseName, version: 1 };
  }

  // Find the highest version and increment
  const maxVersion = Math.max(...versions);
  const nextVersion = maxVersion + 1;

  // Create the suffix (2nd, 3rd, 4th, etc.)
  const suffix = getOrdinalSuffix(nextVersion);
  const versionedName = `${baseName} (${suffix})`;

  console.log(`   🔢 Found ${versions.length} existing version(s), creating version ${nextVersion}`);
  return { name: versionedName, version: nextVersion };
}

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, 4th, etc.)
 */
function getOrdinalSuffix(num) {
  const j = num % 10;
  const k = num % 100;

  if (j === 1 && k !== 11) {
    return `${num}st`;
  }
  if (j === 2 && k !== 12) {
    return `${num}nd`;
  }
  if (j === 3 && k !== 13) {
    return `${num}rd`;
  }
  return `${num}th`;
}

/**
 * Sanitize folder name to be safe for Google Drive
 */
function sanitizeFolderName(name) {
  // Remove or replace characters that might cause issues
  return name.replace(/[/<>:"|?*\\]/g, '-').trim();
}

/**
 * Get organized folder path for uploads
 * Creates: MainFolder/[Code, PropertyType, EndowedTo]/Date/subfolder
 * Automatically creates versioned date folders for multiple uploads on same day
 */
async function getOrganizedFolderPath(propertyCode, propertyType, endowedTo, subfolder = 'الصور الرئيسية', newSession = false) {
  const mainFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  const today = format(new Date(), 'yyyy-MM-dd');

  // Create: MainFolder/[Code, PropertyType, EndowedTo]
  const propertyFolderName = sanitizeFolderName(`${propertyCode}, ${propertyType}, ${endowedTo}`);
  const propertyFolderId = await getOrCreateFolder(mainFolderId, propertyFolderName);

  // ALWAYS check for existing date folders and create versioned folder
  // NEVER reuse date folders - each report gets its own dated folder
  const versionedDate = await getNextVersionedFolderName(propertyFolderId, today);
  const dateFolderId = await getOrCreateFolder(propertyFolderId, versionedDate.name, false);

  if (versionedDate.version === 1) {
    console.log(`   📅 First report today: ${versionedDate.name}`);
  } else {
    console.log(`   📅 New report: ${versionedDate.name} (${versionedDate.version} reports today)`);
  }

  // Create: MainFolder/[Code, PropertyType, EndowedTo]/Date/subfolder
  const subFolderId = await getOrCreateFolder(dateFolderId, subfolder);

  return subFolderId;
}

/**
 * Upload a file to Google Drive
 * @param {Buffer} fileBuffer - File content
 * @param {string} fileName - File name
 * @param {string} mimeType - MIME type
 * @param {string} propertyCode - Property code for organization
 * @param {string} propertyType - Property type (نوع العقار)
 * @param {string} endowedTo - Endowed to (موقوف على)
 * @param {string} subfolder - Subfolder name (e.g., 'الصور الرئيسية', 'Finding1 - description')
 * @param {boolean} newSession - If true, creates new versioned date folder
 */
export async function uploadFile(fileBuffer, fileName, mimeType, propertyCode, propertyType, endowedTo, subfolder = 'الصور الرئيسية', newSession = false) {
  try {
    const drive = await getDriveClient();

    // Get organized folder path
    console.log(`   📂 Organizing folder structure...`);
    const folderId = await getOrganizedFolderPath(propertyCode, propertyType, endowedTo, subfolder, newSession);

    // Create readable stream from buffer
    const bufferStream = Readable.from(fileBuffer);

    // Use original filename (no timestamp prefix for cleaner names)
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._\u0600-\u06FF\s-]/g, '_');

    // Upload file
    console.log(`   ⬆️  Uploading to Google Drive: ${sanitizedFileName}`);
    const fileMetadata = {
      name: sanitizedFileName,
      parents: [folderId]
    };

    const media = {
      mimeType: mimeType,
      body: bufferStream
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink, webContentLink'
    });

    console.log(`   ✓ File uploaded successfully: ${response.data.id}`);

    // Make file accessible (optional - set appropriate permissions)
    // For now, we'll keep it private to the service account
    // If you want public access, uncomment below:
    /*
    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });
    */

    return {
      fileId: response.data.id,
      fileName: sanitizedFileName,
      url: response.data.webViewLink || `https://drive.google.com/file/d/${response.data.id}/view`,
      downloadUrl: response.data.webContentLink
    };
  } catch (error) {
    console.error('❌ Error uploading file to Google Drive:', error.message);

    // Provide more specific error messages
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
 * Upload multiple files
 * All files go to the SAME versioned date folder
 */
export async function uploadMultipleFiles(files, propertyCode, propertyType, endowedTo, subfolder = 'الصور الرئيسية', newSession = false) {
  try {
    const drive = await getDriveClient();
    const mainFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    const today = format(new Date(), 'yyyy-MM-dd');

    // Get property folder (reused)
    const propertyFolderName = sanitizeFolderName(`${propertyCode}, ${propertyType}, ${endowedTo}`);
    const propertyFolderId = await getOrCreateFolder(mainFolderId, propertyFolderName);

    // Get versioned date folder ONCE for ALL files
    const versionedDate = await getNextVersionedFolderName(propertyFolderId, today);
    const dateFolderId = await getOrCreateFolder(propertyFolderId, versionedDate.name, false);

    if (versionedDate.version === 1) {
      console.log(`   📅 First report today: ${versionedDate.name}`);
    } else {
      console.log(`   📅 New report: ${versionedDate.name} (${versionedDate.version} reports today)`);
    }

    // Get subfolder ONCE for ALL files
    const subFolderId = await getOrCreateFolder(dateFolderId, subfolder);

    // Upload ALL files to the SAME folder
    const uploadPromises = files.map(async (file, index) => {
      console.log(`   [${index + 1}/${files.length}] Uploading: ${file.originalname}`);

      const bufferStream = Readable.from(file.buffer);
      const sanitizedFileName = file.originalname.replace(/[^a-zA-Z0-9._\u0600-\u06FF\s-]/g, '_');

      const fileMetadata = {
        name: sanitizedFileName,
        parents: [subFolderId]
      };

      const media = {
        mimeType: file.mimetype,
        body: bufferStream
      };

      const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink, webContentLink'
      });

      console.log(`   ✓ [${index + 1}/${files.length}] ${sanitizedFileName} uploaded`);

      return {
        fileId: response.data.id,
        fileName: sanitizedFileName,
        url: response.data.webViewLink || `https://drive.google.com/file/d/${response.data.id}/view`,
        downloadUrl: response.data.webContentLink
      };
    });

    const results = await Promise.all(uploadPromises);
    console.log(`   ✓ All ${results.length} files uploaded to ${versionedDate.name}/${subfolder}`);
    return results;
  } catch (error) {
    console.error(`   ❌ Error during batch upload: ${error.message}`);
    throw error;
  }
}

/**
 * Get folder structure for a property
 */
export async function getPropertyFolderStructure(propertyCode) {
  try {
    const drive = await getDriveClient();
    const mainFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    // Search for property folder
    const query = `name='${propertyCode}' and '${mainFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;

    const response = await drive.files.list({
      q: query,
      fields: 'files(id, name, webViewLink)',
      spaces: 'drive'
    });

    if (response.data.files && response.data.files.length > 0) {
      return {
        exists: true,
        folderId: response.data.files[0].id,
        folderUrl: response.data.files[0].webViewLink
      };
    }

    return { exists: false };
  } catch (error) {
    console.error('Error getting folder structure:', error.message);
    throw new Error('Failed to get folder structure');
  }
}
