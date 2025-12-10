import * as driveService from '../services/driveService.js';

/**
 * Upload a file to Google Drive
 * POST /api/upload
 */
export async function uploadFileHandler(req, res) {
  let uploadResult = null;

  try {
    if (!req.file) {
      console.error('❌ No file provided in request');
      return res.status(400).json({
        error: 'No file provided',
        message: 'Please upload a file',
        details: 'The request must include a file in the "file" field'
      });
    }

    const { propertyCode, propertyType, endowedTo, subfolder } = req.body;

    console.log('📥 Upload request received:', {
      file: req.file?.originalname,
      fileSize: `${(req.file?.size / 1024).toFixed(2)} KB`,
      mimeType: req.file?.mimetype,
      propertyCode,
      propertyType,
      endowedTo,
      subfolder
    });

    if (!propertyCode) {
      console.error('❌ Property code missing from request');
      return res.status(400).json({
        error: 'Property code required',
        message: 'Please provide propertyCode in the request',
        details: 'propertyCode is a required field'
      });
    }

    const file = req.file;

    // Upload to Google Drive
    console.log(`⏳ Uploading ${file.originalname} to Google Drive...`);
    uploadResult = await driveService.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      propertyCode,
      propertyType || '',
      endowedTo || '',
      subfolder || 'الصور الرئيسية'
    );

    console.log(`✅ Upload successful: ${file.originalname} → ${uploadResult.fileName}`);
    console.log(`   Property: ${propertyCode}, ${propertyType}, ${endowedTo}`);
    console.log(`   Subfolder: ${subfolder || 'الصور الرئيسية'}`);
    console.log(`   File ID: ${uploadResult.fileId}`);

    res.json({
      success: true,
      url: uploadResult.url,
      filename: uploadResult.fileName,
      fileId: uploadResult.fileId,
      message: 'File uploaded successfully'
    });
  } catch (error) {
    console.error('❌ Upload error:', error.message);
    console.error('   Error details:', error);

    // If file was uploaded successfully but something else failed
    if (uploadResult) {
      console.log('⚠️  Note: File was uploaded successfully despite error');
      return res.status(500).json({
        error: 'Partial success',
        message: `File was uploaded successfully, but an error occurred: ${error.message}`,
        uploaded: true,
        url: uploadResult.url,
        filename: uploadResult.fileName,
        fileId: uploadResult.fileId,
        details: error.message
      });
    }

    // Upload failed
    res.status(500).json({
      error: 'Upload failed',
      message: error.message,
      uploaded: false,
      details: 'The file could not be uploaded to Google Drive. Please check your connection and try again.'
    });
  }
}

/**
 * Upload multiple files
 * POST /api/upload/multiple
 */
export async function uploadMultipleFilesHandler(req, res) {
  let uploadedFiles = [];

  try {
    if (!req.files || req.files.length === 0) {
      console.error('❌ No files provided in request');
      return res.status(400).json({
        error: 'No files provided',
        message: 'Please upload at least one file',
        details: 'The request must include files in the "files" field'
      });
    }

    const { propertyCode, propertyType, endowedTo, subfolder } = req.body;

    console.log(`📥 Multiple upload request received: ${req.files.length} files`);
    console.log(`   Property: ${propertyCode}, ${propertyType}, ${endowedTo}`);
    console.log(`   Files: ${req.files.map(f => f.originalname).join(', ')}`);

    if (!propertyCode) {
      console.error('❌ Property code missing from request');
      return res.status(400).json({
        error: 'Property code required',
        message: 'Please provide propertyCode in the request',
        details: 'propertyCode is a required field'
      });
    }

    // Upload all files
    console.log(`⏳ Uploading ${req.files.length} files to Google Drive...`);
    uploadedFiles = await driveService.uploadMultipleFiles(
      req.files,
      propertyCode,
      propertyType || '',
      endowedTo || '',
      subfolder || 'الصور الرئيسية'
    );

    console.log(`✅ Successfully uploaded ${uploadedFiles.length} files`);
    console.log(`   Property: ${propertyCode}, ${propertyType}, ${endowedTo}`);
    console.log(`   Subfolder: ${subfolder || 'الصور الرئيسية'}`);

    res.json({
      success: true,
      files: uploadedFiles,
      count: uploadedFiles.length,
      message: `Successfully uploaded ${uploadedFiles.length} file(s)`
    });
  } catch (error) {
    console.error('❌ Multiple upload error:', error.message);
    console.error('   Error details:', error);

    // If some files were uploaded successfully
    if (uploadedFiles.length > 0) {
      console.log(`⚠️  Note: ${uploadedFiles.length} file(s) were uploaded successfully despite error`);
      return res.status(500).json({
        error: 'Partial success',
        message: `${uploadedFiles.length} file(s) uploaded successfully, but an error occurred: ${error.message}`,
        uploaded: true,
        files: uploadedFiles,
        count: uploadedFiles.length,
        details: error.message
      });
    }

    // All uploads failed
    res.status(500).json({
      error: 'Upload failed',
      message: error.message,
      uploaded: false,
      count: 0,
      details: 'The files could not be uploaded to Google Drive. Please check your connection and try again.'
    });
  }
}
