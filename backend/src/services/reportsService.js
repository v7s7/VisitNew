import { getSheetsClient } from '../config/google-hybrid.js';
import { formatInTimeZone } from 'date-fns-tz';

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
 *
 * OPTIONAL (recommended for exports caching later):
 * Column AG: exports (JSON string: { pdfUrl, zipUrl, folderUrl, pdfName, zipName, generatedAt })
 */

const BAHRAIN_TIMEZONE = 'Asia/Bahrain';

function parseOptionalInt(value) {
  if (value === undefined || value === null) return undefined;
  const s = String(value).trim();
  if (!s) return undefined;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : undefined;
}

function safeJsonParse(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

/**
 * Get the next sequential report ID
 */
async function getNextReportId(sheets, spreadsheetId, sheetName) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A2:A`,
    });

    const rows = response.data.values || [];

    if (rows.length === 0) {
      return 'REPORT-001';
    }

    const lastReportId = rows[rows.length - 1][0] || 'REPORT-000';
    const lastNumber = parseInt(String(lastReportId).split('-')[1], 10) || 0;
    const nextNumber = lastNumber + 1;

    return `REPORT-${String(nextNumber).padStart(3, '0')}`;
  } catch (error) {
    console.error('Error getting next report ID:', error);
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

    const reportId = await getNextReportId(sheets, spreadsheetId, sheetName);

    const now = new Date();
    const submitDate = formatInTimeZone(now, BAHRAIN_TIMEZONE, 'yyyy-MM-dd');
    const submitTime = formatInTimeZone(now, BAHRAIN_TIMEZONE, 'HH:mm:ss');

    const mainPhotosUrls = JSON.stringify(
      report.mainPhotos?.map((p) => p.uploadedUrl || p.url).filter(Boolean) || []
    );

    const complaintFiles = JSON.stringify(
      report.complaintFiles?.map((f) => ({
        name: f.name,
        type: f.type,
        size: f.size,
        url: f.uploadedUrl || '',
      })) || []
    );

    const findings = JSON.stringify(
      report.findings?.map((f) => ({
        text: f.text,
        photos: f.photos?.map((p) => p.uploadedUrl || p.url).filter(Boolean) || [],
      })) || []
    );

    const actions = JSON.stringify(report.actions?.map((a) => a.text) || []);

    const rowData = [
      reportId, // A
      submitDate, // B
      submitTime, // C
      report.propertyId || '', // D
      report.propertyCode || '', // E
      report.propertyName || '', // F
      report.waqfType || '', // G
      report.propertyType || '', // H
      report.endowedTo || '', // I
      report.building || '', // J
      report.unitNumber || '', // K
      report.road || '', // L
      report.area || '', // M
      report.governorate || '', // N
      report.block || '', // O
      report.locationDescription || '', // P
      report.locationLink || '', // Q
      report.visitType || '', // R
      report.complaint || '', // S
      report.complaintFiles?.length || 0, // T
      complaintFiles, // U
      report.mainPhotos?.length || 0, // V
      mainPhotosUrls, // W
      report.findings?.length || 0, // X
      findings, // Y
      report.actions?.length || 0, // Z
      actions, // AA
      report.corrector || '', // AB
      report.inspectorName || '', // AC
      report.floorsCount ?? '', // AD
      report.flatsCount ?? '', // AE
      report.additionalNotes || '', // AF
      // AG reserved for exports JSON (optional)
    ];

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:AF`,
      valueInputOption: 'RAW',
      requestBody: { values: [rowData] },
    });

    console.log(`✅ Report saved to Google Sheet: ${reportId}`);
    console.log(`   Property: ${report.propertyName} (${report.propertyCode})`);
    console.log(`   Row: ${response.data.updates.updatedRange}`);

    return {
      success: true,
      reportId,
      spreadsheetId,
      range: response.data.updates.updatedRange,
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
      range: `${sheetName}!A2:AF`,
    });

    const rows = response.data.values || [];

    return rows.map((row) => ({
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
      complaintFilesCount: parseInt(row[19], 10) || 0,
      complaintFiles: safeJsonParse(row[20], []),
      mainPhotosCount: parseInt(row[21], 10) || 0,
      mainPhotosUrls: safeJsonParse(row[22], []),
      findingsCount: parseInt(row[23], 10) || 0,
      findings: safeJsonParse(row[24], []),
      actionsCount: parseInt(row[25], 10) || 0,
      actions: safeJsonParse(row[26], []),
      corrector: row[27] || '',
      inspectorName: row[28] || '',
      floorsCount: (row[29] || '').trim() || undefined,
      flatsCount: (row[30] || '').trim() || undefined,
      additionalNotes: row[31] || '',
      // exports: safeJsonParse(row[32], null), // if you add AG later
    }));
  } catch (error) {
    console.error('Error fetching reports from Google Sheet:', error.message);
    throw new Error('Failed to fetch reports from database');
  }
}

export async function getReportsByPropertyCode(propertyCode) {
  const allReports = await getAllReports();
  return allReports.filter((report) => report.propertyCode === propertyCode);
}

export async function getReportById(reportId) {
  const allReports = await getAllReports();
  return allReports.find((report) => report.reportId === reportId);
}
