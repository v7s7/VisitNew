import express from 'express';
import cors from 'cors';
import multer from 'multer';

const app = express();
const PORT = 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Mock property database (simulating Google Sheets data)
const mockProperties = [
  {
    id: '1',
    code: '843',
    name: 'عقار النخيل السكني',
    road: 'طريق الملك فهد',
    block: 'مجمع أ',
    area: 'المنامة',
    governorate: 'محافظة العاصمة',
    defaultLocationLink: 'https://maps.google.com/?q=26.2285,50.5860'
  },
  {
    id: '2',
    code: '844',
    name: 'عقار الورود التجاري',
    road: 'شارع البديع',
    block: 'مجمع ب',
    area: 'المحرق',
    governorate: 'محافظة المحرق',
    defaultLocationLink: 'https://maps.google.com/?q=26.2540,50.6130'
  },
  {
    id: '3',
    code: '100',
    name: 'برج المستقبل',
    road: 'طريق الشيخ عيسى',
    block: 'مجمع ج',
    area: 'الرفاع',
    governorate: 'محافظة الجنوبية',
    defaultLocationLink: 'https://maps.google.com/?q=26.1296,50.5550'
  },
  {
    id: '4',
    code: '200',
    name: 'مجمع السلام السكني',
    road: 'طريق الشيخ سلمان',
    block: 'مجمع د',
    area: 'عالي',
    governorate: 'محافظة الوسطى',
    defaultLocationLink: 'https://maps.google.com/?q=26.1540,50.5450'
  },
  {
    id: '5',
    code: '300',
    name: 'عقار الأمل',
    road: 'شارع المعارض',
    block: 'مجمع هـ',
    area: 'سار',
    governorate: 'محافظة الشمالية',
    defaultLocationLink: 'https://maps.google.com/?q=26.1940,50.5050'
  },
  {
    id: '6',
    code: '500',
    name: 'النخيل مول',
    road: 'طريق البحرين',
    block: 'مجمع و',
    area: 'السيف',
    governorate: 'محافظة العاصمة',
    defaultLocationLink: 'https://maps.google.com/?q=26.2385,50.5960'
  },
  {
    id: '7',
    code: '501',
    name: 'عمارة الزهراء',
    road: 'شارع الحورة',
    block: 'مجمع ز',
    area: 'الحورة',
    governorate: 'محافظة العاصمة',
    defaultLocationLink: 'https://maps.google.com/?q=26.2185,50.5760'
  },
  {
    id: '8',
    code: '600',
    name: 'مركز التسوق الكبير',
    road: 'طريق الملك حمد',
    block: 'مجمع ح',
    area: 'السلمانية',
    governorate: 'محافظة العاصمة',
    defaultLocationLink: 'https://maps.google.com/?q=26.2085,50.5960'
  }
];

// Generate more mock properties to simulate ~1000 properties
for (let i = 9; i <= 1000; i++) {
  const areas = ['المنامة', 'المحرق', 'الرفاع', 'عالي', 'سار', 'السيف', 'الحورة', 'السلمانية'];
  const governorates = ['محافظة العاصمة', 'محافظة المحرق', 'محافظة الجنوبية', 'محافظة الوسطى', 'محافظة الشمالية'];
  const roads = ['طريق الملك فهد', 'شارع البديع', 'طريق الشيخ عيسى', 'طريق الشيخ سلمان', 'شارع المعارض'];

  mockProperties.push({
    id: String(i),
    code: String(1000 + i),
    name: `عقار رقم ${i}`,
    road: roads[Math.floor(Math.random() * roads.length)],
    block: `مجمع ${String.fromCharCode(65 + (i % 26))}`,
    area: areas[Math.floor(Math.random() * areas.length)],
    governorate: governorates[Math.floor(Math.random() * governorates.length)],
    defaultLocationLink: `https://maps.google.com/?q=26.${Math.floor(Math.random() * 3000)},50.${Math.floor(Math.random() * 6000)}`
  });
}

// Store reports in memory (in real app, this would go to Google Sheets)
const reports = [];

// API Routes

// 1. Search Properties
app.get('/api/properties', (req, res) => {
  const searchQuery = req.query.search?.toLowerCase() || '';

  if (!searchQuery) {
    return res.json({ properties: [], total: 0 });
  }

  const filteredProperties = mockProperties.filter(prop =>
    prop.name.toLowerCase().includes(searchQuery) ||
    prop.code.includes(searchQuery) ||
    prop.area.toLowerCase().includes(searchQuery)
  );

  // Limit results to 20 for better performance
  const limitedResults = filteredProperties.slice(0, 20);

  console.log(`🔍 Search query: "${searchQuery}" - Found ${filteredProperties.length} properties, returning ${limitedResults.length}`);

  res.json({
    properties: limitedResults,
    total: filteredProperties.length
  });
});

// 2. Upload File
app.post('/api/upload', upload.single('file'), (req, res) => {
  const file = req.file;
  const propertyCode = req.body.propertyCode;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // In real app, this would upload to Google Drive
  // For now, we simulate a successful upload
  const mockUrl = `https://drive.google.com/file/mock_${Date.now()}_${file.originalname}`;

  console.log(`📤 Uploaded file: ${file.originalname} (${(file.size / 1024).toFixed(2)} KB) for property ${propertyCode}`);

  res.json({
    url: mockUrl,
    filename: file.originalname
  });
});

// 3. Submit Report
app.post('/api/reports', (req, res) => {
  const report = req.body;

  // Validate required fields
  if (!report.propertyId || !report.visitType || !report.complaint) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields'
    });
  }

  // Generate report ID
  const reportId = `REPORT_${Date.now()}`;

  // Store report (in real app, this would go to Google Sheets)
  reports.push({
    ...report,
    reportId,
    createdAt: new Date().toISOString()
  });

  console.log(`✅ Report submitted successfully!`);
  console.log(`   Property: ${report.propertyName} (${report.propertyCode})`);
  console.log(`   Visit Type: ${report.visitType}`);
  console.log(`   Main Photos: ${report.mainPhotos?.length || 0}`);
  console.log(`   Findings: ${report.findings?.length || 0}`);
  console.log(`   Actions: ${report.actions?.length || 0}`);
  console.log(`   Report ID: ${reportId}`);

  res.json({
    success: true,
    reportId,
    message: 'Report submitted successfully'
  });
});

// Get all reports (bonus endpoint for testing)
app.get('/api/reports', (req, res) => {
  res.json({
    reports,
    total: reports.length
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Mock API server is running',
    endpoints: {
      search: 'GET /api/properties?search=<query>',
      upload: 'POST /api/upload',
      submit: 'POST /api/reports',
      getReports: 'GET /api/reports'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('🚀 ========================================');
  console.log(`✅ Mock API Server is running!`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log('========================================');
  console.log('');
  console.log('📝 Available Endpoints:');
  console.log(`   GET  http://localhost:${PORT}/api/health`);
  console.log(`   GET  http://localhost:${PORT}/api/properties?search=<query>`);
  console.log(`   POST http://localhost:${PORT}/api/upload`);
  console.log(`   POST http://localhost:${PORT}/api/reports`);
  console.log(`   GET  http://localhost:${PORT}/api/reports`);
  console.log('');
  console.log(`📊 Mock Database: ${mockProperties.length} properties loaded`);
  console.log('');
  console.log('💡 Try searching for: 843, النخيل, المنامة');
  console.log('');
});
