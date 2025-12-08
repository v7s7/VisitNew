import * as driveService from '../services/driveService.js';

/**
 * Upload a file to Google Drive
 * POST /api/upload
 */
export async function uploadFileHandler(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file provided',
        message: 'Please upload a file'
      });
    }

    const { propertyCode, subfolder } = req.body;

    if (!propertyCode) {
      return res.status(400).json({
        error: 'Property code required',
        message: 'Please provide propertyCode in the request'
      });
    }

    const file = req.file;

    // Upload to Google Drive
    const result = await driveService.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      propertyCode,
      subfolder || 'main'
    );

    console.log(`📤 Uploaded: ${file.originalname} → ${result.fileName}`);
    console.log(`   Property: ${propertyCode} | Subfolder: ${subfolder || 'main'}`);

    res.json({
      success: true,
      url: result.url,
      filename: result.fileName,
      fileId: result.fileId
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: 'Upload failed',
      message: error.message
    });
  }
}

/**
 * Upload multiple files
 * POST /api/upload/multiple
 */
export async function uploadMultipleFilesHandler(req, res) {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'No files provided',
        message: 'Please upload at least one file'
      });
    }

    const { propertyCode, subfolder } = req.body;

    if (!propertyCode) {
      return res.status(400).json({
        error: 'Property code required',
        message: 'Please provide propertyCode in the request'
      });
    }

    // Upload all files
    const results = await driveService.uploadMultipleFiles(
      req.files,
      propertyCode,
      subfolder || 'main'
    );

    console.log(`📤 Uploaded ${results.length} files for property ${propertyCode}`);

    res.json({
      success: true,
      files: results
    });
  } catch (error) {
    console.error('Multiple upload error:', error);
    res.status(500).json({
      error: 'Upload failed',
      message: error.message
    });
  }
}
