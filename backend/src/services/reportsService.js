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
 * Column S: mainPhotosCount
 * Column T: mainPhotosUrls (JSON string)
 * Column U: findingsCount
 * Column V: findings (JSON string)
 * Column W: actionsCount
 * Column X: actions (JSON string)
 * Column Y: corrector
 * Column Z: inspectorName
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
      report.mainPhotos?.length || 0,              // S: mainPhotosCount
      mainPhotosUrls,                              // T: mainPhotosUrls
      report.findings?.length || 0,                // U: findingsCount
      findings,                                    // V: findings
      report.actions?.length || 0,                 // W: actionsCount
      actions,                                     // X: actions
      report.corrector || '',                      // Y: corrector
      report.inspectorName || ''                   // Z: inspectorName
    ];

    // Append to sheet
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
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
      range: `${sheetName}!A2:Z`, // Skip header row
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
      mainPhotosCount: parseInt(row[18]) || 0,
      mainPhotosUrls: row[19] ? JSON.parse(row[19]) : [],
      findingsCount: parseInt(row[20]) || 0,
      findings: row[21] ? JSON.parse(row[21]) : [],
      actionsCount: parseInt(row[22]) || 0,
      actions: row[23] ? JSON.parse(row[23]) : [],
      corrector: row[24] || '',
      inspectorName: row[25] || ''
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
