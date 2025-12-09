import { getSheetsClient } from '../config/google-hybrid.js';
import { format } from 'date-fns';

/**
 * Reports Sheet Structure:
 * Column A: reportId
 * Column B: submittedAt
 * Column C: propertyId
 * Column D: propertyCode
 * Column E: propertyName
 * Column F: road
 * Column G: area
 * Column H: governorate
 * Column I: block
 * Column J: locationDescription
 * Column K: locationLink
 * Column L: visitType
 * Column M: complaint
 * Column N: mainPhotosCount
 * Column O: mainPhotosUrls (JSON string)
 * Column P: findingsCount
 * Column Q: findings (JSON string)
 * Column R: actionsCount
 * Column S: actions (JSON string)
 * Column T: corrector
 * Column U: inspectorName
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
      report.road || '',                           // F: road
      report.area || '',                           // G: area
      report.governorate || '',                    // H: governorate
      report.block || '',                          // I: block
      report.locationDescription || '',            // J: locationDescription
      report.locationLink || '',                   // K: locationLink
      report.visitType || '',                      // L: visitType
      report.complaint || '',                      // M: complaint
      report.mainPhotos?.length || 0,              // N: mainPhotosCount
      mainPhotosUrls,                              // O: mainPhotosUrls
      report.findings?.length || 0,                // P: findingsCount
      findings,                                    // Q: findings
      report.actions?.length || 0,                 // R: actionsCount
      actions,                                     // S: actions
      report.corrector || '',                      // T: corrector
      report.inspectorName || ''                   // U: inspectorName
    ];

    // Append to sheet
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:U`,
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
      range: `${sheetName}!A2:U`, // Skip header row
    });

    const rows = response.data.values || [];

    const reports = rows.map(row => ({
      reportId: row[0] || '',
      submittedAt: row[1] || '',
      propertyId: row[2] || '',
      propertyCode: row[3] || '',
      propertyName: row[4] || '',
      road: row[5] || '',
      area: row[6] || '',
      governorate: row[7] || '',
      block: row[8] || '',
      locationDescription: row[9] || '',
      locationLink: row[10] || '',
      visitType: row[11] || '',
      complaint: row[12] || '',
      mainPhotosCount: parseInt(row[13]) || 0,
      mainPhotosUrls: row[14] ? JSON.parse(row[14]) : [],
      findingsCount: parseInt(row[15]) || 0,
      findings: row[16] ? JSON.parse(row[16]) : [],
      actionsCount: parseInt(row[17]) || 0,
      actions: row[18] ? JSON.parse(row[18]) : [],
      corrector: row[19] || '',
      inspectorName: row[20] || ''
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
