import { getSheetsClient } from '../config/google-hybrid.js';
import { format, formatInTimeZone } from 'date-fns-tz';

/**
 * Reports Sheet Structure:
 * Column A: reportId (REPORT-001, REPORT-002, etc.)
 * Column B: submitDate (YYYY-MM-DD format)
 * Column C: submitTime (HH:mm:ss format, Bahrain time)
 * Column D: propertyId
 * Column E: propertyCode
 * Column F: propertyName
 * Column G: waqfType (نوع الوقف)
 * Column H: propertyType (نوع العقار)
 * Column I: endowedTo (موقوف على)
 * Column J: building (مبنى)
 * Column K: unitNumber (رقم الوحدة)
 * Column L: road (طريق / شارع)
 * Column M: area (المنطقة)
 * Column N: governorate (المحافظة)
 * Column O: block (مجمع)
 * Column P: locationDescription
 * Column Q: locationLink
 * Column R: visitType
 * Column S: complaint
 * Column T: complaintFilesCount
 * Column U: complaintFiles (JSON string)
 * Column V: mainPhotosCount
 * Column W: mainPhotosUrls (JSON string)
 * Column X: findingsCount
 * Column Y: findings (JSON string)
 * Column Z: actionsCount
 * Column AA: actions (JSON string)
 * Column AB: corrector
 * Column AC: inspectorName
 * Column AD: floorsCount (عدد الطوابق)
 * Column AE: flatsCount (عدد الشقق)
 * Column AF: additionalNotes (ملاحظات إضافية)
 */

const BAHRAIN_TIMEZONE = 'Asia/Bahrain';

/**
 * Get the next sequential report ID
 */
async function getNextReportId(sheets, spreadsheetId, sheetName) {
  try {
    // Get all report IDs from column A
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A2:A`, // Skip header row
    });

    const rows = response.data.values || [];

    if (rows.length === 0) {
      return 'REPORT-001'; // First report
    }

    // Extract the last report number
    const lastReportId = rows[rows.length - 1][0] || 'REPORT-000';
    const lastNumber = parseInt(lastReportId.split('-')[1]) || 0;
    const nextNumber = lastNumber + 1;

    // Format with leading zeros (e.g., REPORT-001, REPORT-012, REPORT-123)
    return `REPORT-${String(nextNumber).padStart(3, '0')}`;
  } catch (error) {
    console.error('Error getting next report ID:', error);
    // Fallback to timestamp-based ID if there's an error
    return `REPORT-${Date.now()}`;
  }
}

/**
 * Append a report to Google Sheet
 */
export async function saveReport(report) {
  try {
    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEETS_REPORTS_ID;
    const sheetName = process.env.REPORTS_SHEET_NAME || 'Reports';

    // Generate sequential report ID
    const reportId = await getNextReportId(sheets, spreadsheetId, sheetName);

    // Get current time in Bahrain timezone
    const now = new Date();
    const submitDate = formatInTimeZone(now, BAHRAIN_TIMEZONE, 'yyyy-MM-dd');
    const submitTime = formatInTimeZone(now, BAHRAIN_TIMEZONE, 'HH:mm:ss');

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
      reportId,                                    // A: reportId (REPORT-001)
      submitDate,                                  // B: submitDate (YYYY-MM-DD)
      submitTime,                                  // C: submitTime (HH:mm:ss)
      report.propertyId || '',                     // D: propertyId
      report.propertyCode || '',                   // E: propertyCode
      report.propertyName || '',                   // F: propertyName
      report.waqfType || '',                       // G: waqfType
      report.propertyType || '',                   // H: propertyType
      report.endowedTo || '',                      // I: endowedTo
      report.building || '',                       // J: building
      report.unitNumber || '',                     // K: unitNumber
      report.road || '',                           // L: road
      report.area || '',                           // M: area
      report.governorate || '',                    // N: governorate
      report.block || '',                          // O: block
      report.locationDescription || '',            // P: locationDescription
      report.locationLink || '',                   // Q: locationLink
      report.visitType || '',                      // R: visitType
      report.complaint || '',                      // S: complaint
      report.complaintFiles?.length || 0,          // T: complaintFilesCount
      complaintFiles,                              // U: complaintFiles
      report.mainPhotos?.length || 0,              // V: mainPhotosCount
      mainPhotosUrls,                              // W: mainPhotosUrls
      report.findings?.length || 0,                // X: findingsCount
      findings,                                    // Y: findings
      report.actions?.length || 0,                 // Z: actionsCount
      actions,                                     // AA: actions
      report.corrector || '',                      // AB: corrector
      report.inspectorName || '',                  // AC: inspectorName
      report.floorsCount || '',                    // AD: floorsCount
      report.flatsCount || '',                     // AE: flatsCount
      report.additionalNotes || ''                 // AF: additionalNotes
    ];

    // Append to sheet
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:AF`,
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
      range: `${sheetName}!A2:AF`, // Skip header row
    });

    const rows = response.data.values || [];

    const reports = rows.map(row => ({
      reportId: row[0] || '',
      submitDate: row[1] || '',
      submitTime: row[2] || '',
      propertyId: row[3] || '',
      propertyCode: row[4] || '',
      propertyName: row[5] || '',
      waqfType: row[6] || '',
      propertyType: row[7] || '',
      endowedTo: row[8] || '',
      building: row[9] || '',
      unitNumber: row[10] || '',
      road: row[11] || '',
      area: row[12] || '',
      governorate: row[13] || '',
      block: row[14] || '',
      locationDescription: row[15] || '',
      locationLink: row[16] || '',
      visitType: row[17] || '',
      complaint: row[18] || '',
      complaintFilesCount: parseInt(row[19]) || 0,
      complaintFiles: row[20] ? JSON.parse(row[20]) : [],
      mainPhotosCount: parseInt(row[21]) || 0,
      mainPhotosUrls: row[22] ? JSON.parse(row[22]) : [],
      findingsCount: parseInt(row[23]) || 0,
      findings: row[24] ? JSON.parse(row[24]) : [],
      actionsCount: parseInt(row[25]) || 0,
      actions: row[26] ? JSON.parse(row[26]) : [],
      corrector: row[27] || '',
      inspectorName: row[28] || '',
      floorsCount: parseInt(row[29]) || 0,
      flatsCount: parseInt(row[30]) || 0,
      additionalNotes: row[31] || ''
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
