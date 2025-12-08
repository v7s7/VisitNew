import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes/index.js';
import { validateConfig } from './config/google.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// API routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'VisitProp Backend API',
    version: '1.0.0',
    documentation: '/api/health'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        message: 'Maximum file size is 10MB'
      });
    }
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Cannot ${req.method} ${req.path}`
  });
});

// Start server
async function startServer() {
  try {
    // Validate configuration
    console.log('🔍 Validating configuration...');
    validateConfig();
    console.log('✅ Configuration valid');

    // Start listening
    app.listen(PORT, () => {
      console.log('');
      console.log('🚀 ========================================');
      console.log('✅ VisitProp Backend Server is running!');
      console.log(`📍 URL: http://localhost:${PORT}`);
      console.log('========================================');
      console.log('');
      console.log('📝 API Endpoints:');
      console.log(`   GET  http://localhost:${PORT}/api/health`);
      console.log(`   GET  http://localhost:${PORT}/api/properties?search=<query>`);
      console.log(`   POST http://localhost:${PORT}/api/upload`);
      console.log(`   POST http://localhost:${PORT}/api/reports`);
      console.log(`   GET  http://localhost:${PORT}/api/reports`);
      console.log('');
      console.log('🔗 Connected Services:');
      console.log(`   📊 Properties Sheet: ${process.env.GOOGLE_SHEETS_PROPERTIES_ID}`);
      console.log(`   📋 Reports Sheet: ${process.env.GOOGLE_SHEETS_REPORTS_ID}`);
      console.log(`   📁 Drive Folder: ${process.env.GOOGLE_DRIVE_FOLDER_ID}`);
      console.log('');
      console.log('✨ Ready to accept requests!');
      console.log('');
    });
  } catch (error) {
    console.error('❌ Failed to start server:');
    console.error(error.message);
    console.error('');
    console.error('Please check:');
    console.error('  1. Your .env file exists and has all required variables');
    console.error('  2. Your google-credentials.json file exists');
    console.error('  3. Your Google Sheets and Drive IDs are correct');
    console.error('');
    process.exit(1);
  }
}

startServer();
