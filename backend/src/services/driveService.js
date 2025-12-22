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
 *         │   ├── photo1.jpg
 *         │   └── photo2.jpg
 *         ├── ملفات البلاغ/ ← all complaint files
 *         │   └── report.pdf
 *         ├── Finding 1 - broken door/ ← all photos for finding 1
 *         │   ├── photo1.jpg
 *         │   └── photo2.jpg
 *         └── Finding 2 - cracked wall/ ← all photos for finding 2
 *             └── photo.jpg
 *
 * How it works:
 * - Property folder: ALWAYS REUSED (same property = same folder)
 * - Date folder: ALWAYS REUSED (same day = same folder, NO versioning)
 * - Multiple submissions on same day: Add to existing date folder
 * - Finding numbers: AUTO-DETECTED (scan existing, continue numbering)
 * - ONE PROPERTY + ONE DATE = ONE FOLDER (all submissions together)
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
 * Get the next available finding number
 * Scans existing "Finding N - ..." folders and returns next N
 * Example: If "Finding 1 - X" and "Finding 2 - Y" exist, returns 3
 */
async function getNextFindingNumber(dateFolderId) {
  const drive = await getDriveClient();

  // Get all folders under the date folder
  const query = `'${dateFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;

  const searchResponse = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    spaces: 'drive'
  });

  if (!searchResponse.data.files || searchResponse.data.files.length === 0) {
    // No folders exist yet, start with 1
    return 1;
  }

  // Find all existing finding folders
  const findingNumbers = [];
  const findingPattern = /^Finding (\d+) - /;

  searchResponse.data.files.forEach(file => {
    const match = file.name.match(findingPattern);
    if (match) {
      findingNumbers.push(parseInt(match[1]));
    }
  });

  if (findingNumbers.length === 0) {
    // No finding folders exist yet
    return 1;
  }

  // Return the next number after the highest
  const maxNumber = Math.max(...findingNumbers);
  return maxNumber + 1;
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
 *
 * For findings: Extracts description and auto-assigns next finding number
 * Example: Frontend sends "Finding 1 - Broken door" → Backend creates "Finding 3 - Broken door"
 */
async function getOrganizedFolderPath(propertyCode, propertyType, endowedTo, subfolder = 'الصور الرئيسية') {
  const mainFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  const today = format(new Date(), 'yyyy-MM-dd');

  // Step 1: Get/create property folder (always reused)
  const propertyFolderName = sanitizeFolderName(`${propertyCode}, ${propertyType}, ${endowedTo}`);
  const propertyFolderId = await getOrCreateFolder(mainFolderId, propertyFolderName);

  // Step 2: Get/create date folder (always reused - ONE folder per day)
  const dateFolderId = await getOrCreateFolder(propertyFolderId, today);
  console.log(`   📅 Using date folder: ${today}`);

  // Step 3: Handle subfolder
  let finalSubfolderName = subfolder;

  // Check if this is a finding folder
  const findingMatch = subfolder.match(/^Finding \d+ - (.+)$/);
  if (findingMatch) {
    // Extract description from frontend's folder name
    const description = findingMatch[1];

    // Get next finding number from existing folders
    const nextNumber = await getNextFindingNumber(dateFolderId);

    // Create new finding folder name with correct number
    finalSubfolderName = `Finding ${nextNumber} - ${description}`;
    console.log(`   🔍 Creating finding folder: ${finalSubfolderName} (auto-detected next number)`);
  }

  // Create/reuse subfolder
  const subFolderId = await getOrCreateFolder(dateFolderId, finalSubfolderName);

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
 * @param {string} subfolder - Subfolder name (e.g., 'الصور الرئيسية', 'Finding 1 - description')
 */
export async function uploadFile(fileBuffer, fileName, mimeType, propertyCode, propertyType, endowedTo, subfolder = 'الصور الرئيسية') {
  try {
    const drive = await getDriveClient();

    // Get organized folder path
    console.log(`   📂 Organizing folder structure...`);
    const folderId = await getOrganizedFolderPath(propertyCode, propertyType, endowedTo, subfolder);

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
 * Upload multiple files to the same subfolder
 * All files go to the SAME date folder (reused for same day)
 * For findings: Each file can go to a different finding folder if needed
 */
export async function uploadMultipleFiles(files, propertyCode, propertyType, endowedTo, subfolder = 'الصور الرئيسية') {
  try {
    const drive = await getDriveClient();

    // Upload ALL files using the same organized path logic
    const uploadPromises = files.map(async (file, index) => {
      console.log(`   [${index + 1}/${files.length}] Uploading: ${file.originalname}`);

      // Get organized folder path for this file
      console.log(`   📂 Organizing folder structure for file ${index + 1}...`);
      const folderId = await getOrganizedFolderPath(propertyCode, propertyType, endowedTo, subfolder);

      const bufferStream = Readable.from(file.buffer);
      const sanitizedFileName = file.originalname.replace(/[^a-zA-Z0-9._\u0600-\u06FF\s-]/g, '_');

      const fileMetadata = {
        name: sanitizedFileName,
        parents: [folderId]
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
    console.log(`   ✓ All ${results.length} files uploaded to ${subfolder}`);
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
