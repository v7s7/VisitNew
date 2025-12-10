import express from 'express';
import multer from 'multer';
import * as propertiesController from '../controllers/propertiesController.js';
import * as uploadController from '../controllers/uploadController.js';
import * as reportsController from '../controllers/reportsController.js';
import * as authController from '../controllers/authController.js';

const router = express.Router();

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Define allowed file types
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
    const allowedDocTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ];

    const isImage = allowedImageTypes.includes(file.mimetype) || file.mimetype.startsWith('image/');
    const isDocument = allowedDocTypes.includes(file.mimetype);

    // Note: req.body.subfolder might be undefined if the file field comes before
    // the subfolder field in the multipart form data. In that case, we allow
    // common file types and validate in the controller.
    const subfolder = req.body.subfolder;

    console.log(`   🔍 File filter check: ${file.originalname} (${file.mimetype}), subfolder: ${subfolder || 'undefined'}`);

    // Allow all common file types if subfolder is not available yet
    if (!subfolder) {
      if (isImage || isDocument) {
        console.log(`   ✓ Accepted (subfolder not available, will validate in controller)`);
        cb(null, true);
      } else {
        console.log(`   ✗ Rejected: unsupported file type`);
        cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: images, PDFs, Word, Excel, text files`), false);
      }
      return;
    }

    // For "ملفات البلاغ" (Report Files), allow documents and images
    if (subfolder === 'ملفات البلاغ') {
      if (isImage || isDocument) {
        console.log(`   ✓ Accepted for ${subfolder}`);
        cb(null, true);
      } else {
        console.log(`   ✗ Rejected: only images and documents allowed for ${subfolder}`);
        cb(new Error('Only images, PDFs, Word documents, Excel files, and text files are allowed for Report Files'), false);
      }
    } else {
      // For other subfolders (photos), accept images only
      if (isImage) {
        console.log(`   ✓ Accepted for ${subfolder}`);
        cb(null, true);
      } else {
        console.log(`   ✗ Rejected: only images allowed for ${subfolder}`);
        cb(new Error(`Only image files are allowed for ${subfolder || 'photo folders'}`), false);
      }
    }
  }
});

// API Health check
router.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'VisitProp API is running',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: {
        login: 'GET /auth/login (Login page)',
        status: 'GET /auth/status',
        logout: 'POST /auth/logout'
      },
      properties: {
        search: 'GET /api/properties?search=<query>',
        getById: 'GET /api/properties/:id'
      },
      upload: {
        single: 'POST /api/upload (multipart/form-data)',
        multiple: 'POST /api/upload/multiple (multipart/form-data)'
      },
      reports: {
        submit: 'POST /api/reports (application/json)',
        getAll: 'GET /api/reports',
        getById: 'GET /api/reports/:id',
        getByProperty: 'GET /api/reports?propertyCode=<code>'
      }
    }
  });
});

// Authentication routes (OAuth 2.0) - mounted at /auth
router.get('/auth/login', authController.loginPage);
router.get('/auth/google', authController.redirectToGoogle);
router.get('/auth/callback', authController.handleCallback);
router.get('/auth/status', authController.checkStatus);
router.post('/auth/logout', authController.logout);

// API routes - mounted at /api
// Properties routes
router.get('/api/properties', propertiesController.searchPropertiesHandler);
router.get('/api/properties/:id', propertiesController.getPropertyHandler);

// Upload routes
router.post('/api/upload', upload.single('file'), uploadController.uploadFileHandler);
router.post('/api/upload/multiple', upload.array('files', 10), uploadController.uploadMultipleFilesHandler);

// Reports routes
router.post('/api/reports', reportsController.submitReportHandler);
router.get('/api/reports', reportsController.getReportsHandler);
router.get('/api/reports/:id', reportsController.getReportHandler);

export default router;
