import { getSheetsClient } from '../config/google-hybrid.js';
import { format } from 'date-fns';

/**
 * Reports Sheet Structure:
 * Column A: reportId
 * Column B: submittedAt
 * Column C: propertyId
 * Column D: propertyCode
 * Column E: propertyName
 * Column F: waqfType (نوع الوقف)
 * Column G: propertyType (نوع العقار)
 * Column H: endowedTo (موقوف على)
 * Column I: building (مبنى)
 * Column J: unitNumber (رقم الوحدة)
 * Column K: road (طريق / شارع)
 * Column L: area (المنطقة)
 * Column M: governorate (المحافظة)
 * Column N: block (مجمع)
 * Column O: locationDescription
 * Column P: locationLink
 * Column Q: visitType
 * Column R: complaint
 * Column S: complaintFilesCount
 * Column T: complaintFiles (JSON string)
 * Column U: mainPhotosCount
 * Column V: mainPhotosUrls (JSON string)
 * Column W: findingsCount
 * Column X: findings (JSON string)
 * Column Y: actionsCount
 * Column Z: actions (JSON string)
 * Column AA: corrector
 * Column AB: inspectorName
 */

/**
 * Append a report to Google Sheet
 */
export async function saveReport(report) {
  try {
    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEETS_REPORTS_ID;
    const sheetName = process.env.REPORTS_SHEET_NAME || 'Reports';

    // Generate report ID
    const reportId = `REPORT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const submittedAt = report.submittedAt || new Date().toISOString();

    // Format photos URLs
    const mainPhotosUrls = JSON.stringify(
      report.mainPhotos?.map(p => p.uploadedUrl || p.url) || []
    );

    // Format complaint files
    const complaintFiles = JSON.stringify(
      report.complaintFiles?.map(f => ({
        name: f.name,
        type: f.type,
        size: f.size,
        url: f.uploadedUrl || ''
      })) || []
    );

    // Format findings (text + photo URLs)
    const findings = JSON.stringify(
      report.findings?.map(f => ({
        text: f.text,
        photos: f.photos?.map(p => p.uploadedUrl || p.url) || []
      })) || []
    );

    // Format actions
    const actions = JSON.stringify(
      report.actions?.map(a => a.text) || []
    );

    // Prepare row data
    const rowData = [
      reportId,                                    // A: reportId
      submittedAt,                                 // B: submittedAt
      report.propertyId || '',                     // C: propertyId
      report.propertyCode || '',                   // D: propertyCode
      report.propertyName || '',                   // E: propertyName
      report.waqfType || '',                       // F: waqfType
      report.propertyType || '',                   // G: propertyType
      report.endowedTo || '',                      // H: endowedTo
      report.building || '',                       // I: building
      report.unitNumber || '',                     // J: unitNumber
      report.road || '',                           // K: road
      report.area || '',                           // L: area
      report.governorate || '',                    // M: governorate
      report.block || '',                          // N: block
      report.locationDescription || '',            // O: locationDescription
      report.locationLink || '',                   // P: locationLink
      report.visitType || '',                      // Q: visitType
      report.complaint || '',                      // R: complaint
      report.complaintFiles?.length || 0,          // S: complaintFilesCount
      complaintFiles,                              // T: complaintFiles
      report.mainPhotos?.length || 0,              // U: mainPhotosCount
      mainPhotosUrls,                              // V: mainPhotosUrls
      report.findings?.length || 0,                // W: findingsCount
      findings,                                    // X: findings
      report.actions?.length || 0,                 // Y: actionsCount
      actions,                                     // Z: actions
      report.corrector || '',                      // AA: corrector
      report.inspectorName || ''                   // AB: inspectorName
    ];

    // Append to sheet
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:AB`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [rowData]
      }
    });

    console.log(`✅ Report saved to Google Sheet: ${reportId}`);
    console.log(`   Property: ${report.propertyName} (${report.propertyCode})`);
    console.log(`   Row: ${response.data.updates.updatedRange}`);

    return {
      success: true,
      reportId,
      spreadsheetId,
      range: response.data.updates.updatedRange
    };
  } catch (error) {
    console.error('Error saving report to Google Sheet:', error.message);
    throw new Error('Failed to save report to database');
  }
}

/**
 * Get all reports
 */
export async function getAllReports() {
  try {
    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEETS_REPORTS_ID;
    const sheetName = process.env.REPORTS_SHEET_NAME || 'Reports';

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A2:AB`, // Skip header row
    });

    const rows = response.data.values || [];

    const reports = rows.map(row => ({
      reportId: row[0] || '',
      submittedAt: row[1] || '',
      propertyId: row[2] || '',
      propertyCode: row[3] || '',
      propertyName: row[4] || '',
      waqfType: row[5] || '',
      propertyType: row[6] || '',
      endowedTo: row[7] || '',
      building: row[8] || '',
      unitNumber: row[9] || '',
      road: row[10] || '',
      area: row[11] || '',
      governorate: row[12] || '',
      block: row[13] || '',
      locationDescription: row[14] || '',
      locationLink: row[15] || '',
      visitType: row[16] || '',
      complaint: row[17] || '',
      complaintFilesCount: parseInt(row[18]) || 0,
      complaintFiles: row[19] ? JSON.parse(row[19]) : [],
      mainPhotosCount: parseInt(row[20]) || 0,
      mainPhotosUrls: row[21] ? JSON.parse(row[21]) : [],
      findingsCount: parseInt(row[22]) || 0,
      findings: row[23] ? JSON.parse(row[23]) : [],
      actionsCount: parseInt(row[24]) || 0,
      actions: row[25] ? JSON.parse(row[25]) : [],
      corrector: row[26] || '',
      inspectorName: row[27] || ''
    }));

    return reports;
  } catch (error) {
    console.error('Error fetching reports from Google Sheet:', error.message);
    throw new Error('Failed to fetch reports from database');
  }
}

/**
 * Get reports by property code
 */
export async function getReportsByPropertyCode(propertyCode) {
  const allReports = await getAllReports();
  return allReports.filter(report => report.propertyCode === propertyCode);
}

/**
 * Get report by ID
 */
export async function getReportById(reportId) {
  const allReports = await getAllReports();
  return allReports.find(report => report.reportId === reportId);
}
