import express from 'express';
import multer from 'multer';
import * as propertiesController from '../controllers/propertiesController.js';
import * as uploadController from '../controllers/uploadController.js';
import * as reportsController from '../controllers/reportsController.js';

const router = express.Router();

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'VisitProp API is running',
    timestamp: new Date().toISOString(),
    endpoints: {
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

// Properties routes
router.get('/properties', propertiesController.searchPropertiesHandler);
router.get('/properties/:id', propertiesController.getPropertyHandler);

// Upload routes
router.post('/upload', upload.single('file'), uploadController.uploadFileHandler);
router.post('/upload/multiple', upload.array('files', 10), uploadController.uploadMultipleFilesHandler);

// Reports routes
router.post('/reports', reportsController.submitReportHandler);
router.get('/reports', reportsController.getReportsHandler);
router.get('/reports/:id', reportsController.getReportHandler);

export default router;
