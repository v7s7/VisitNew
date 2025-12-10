import { getDriveClient } from '../config/google-hybrid.js';
import { format } from 'date-fns';
import { Readable } from 'stream';

/**
 * Folder Structure in Google Drive:
 *
 * Main Folder (GOOGLE_DRIVE_FOLDER_ID)
 * └── "843, سكني, الفقراء والمساكين" (Code, PropertyType, EndowedTo)
 *     └── "2024-01-15" (Date)
 *         ├── الصور الرئيسية/ (Main Photos)
 *         │   ├── photo1.jpg
 *         │   └── photo2.jpg
 *         ├── Finding1 - [finding description]/
 *         │   ├── photo1.jpg
 *         │   └── photo2.jpg
 *         └── Finding2 - [finding description]/
 *             └── photo1.jpg
 */

/**
 * Get or create a folder in Google Drive
 */
async function getOrCreateFolder(parentFolderId, folderName) {
  const drive = await getDriveClient();

  // Search for existing folder
  const query = `name='${folderName}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;

  const searchResponse = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    spaces: 'drive'
  });

  if (searchResponse.data.files && searchResponse.data.files.length > 0) {
    // Folder exists
    return searchResponse.data.files[0].id;
  }

  // Create new folder
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
 * Sanitize folder name to be safe for Google Drive
 */
function sanitizeFolderName(name) {
  // Remove or replace characters that might cause issues
  return name.replace(/[/<>:"|?*\\]/g, '-').trim();
}

/**
 * Get organized folder path for uploads
 * Creates: MainFolder/[Code, PropertyType, EndowedTo]/Date/subfolder
 */
async function getOrganizedFolderPath(propertyCode, propertyType, endowedTo, subfolder = 'الصور الرئيسية') {
  const mainFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  const today = format(new Date(), 'yyyy-MM-dd');

  // Create: MainFolder/[Code, PropertyType, EndowedTo]
  const propertyFolderName = sanitizeFolderName(`${propertyCode}, ${propertyType}, ${endowedTo}`);
  const propertyFolderId = await getOrCreateFolder(mainFolderId, propertyFolderName);

  // Create: MainFolder/[Code, PropertyType, EndowedTo]/Date
  const dateFolderId = await getOrCreateFolder(propertyFolderId, today);

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
 */
export async function uploadFile(fileBuffer, fileName, mimeType, propertyCode, propertyType, endowedTo, subfolder = 'الصور الرئيسية') {
  try {
    const drive = await getDriveClient();

    // Get organized folder path
    const folderId = await getOrganizedFolderPath(propertyCode, propertyType, endowedTo, subfolder);

    // Create readable stream from buffer
    const bufferStream = Readable.from(fileBuffer);

    // Use original filename (no timestamp prefix for cleaner names)
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._\u0600-\u06FF\s-]/g, '_');

    // Upload file
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
    console.error('Error uploading file to Google Drive:', error.message);
    throw new Error('Failed to upload file to Google Drive');
  }
}

/**
 * Upload multiple files
 */
export async function uploadMultipleFiles(files, propertyCode, propertyType, endowedTo, subfolder = 'الصور الرئيسية') {
  const uploadPromises = files.map(file =>
    uploadFile(file.buffer, file.originalname, file.mimetype, propertyCode, propertyType, endowedTo, subfolder)
  );

  return await Promise.all(uploadPromises);
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
