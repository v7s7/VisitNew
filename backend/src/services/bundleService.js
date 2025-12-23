import JSZip from 'jszip';
import { generatePdfBuffer } from './pdfService.js';

function safeStr(v) {
  return v === undefined || v === null ? '' : String(v);
}

function sanitizeFileName(name) {
  return safeStr(name)
    .replace(/[/\\<>:"|?*]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function getBahrainDateString(date = new Date()) {
  const options = { timeZone: 'Asia/Bahrain', year: 'numeric', month: '2-digit', day: '2-digit' };
  const formatter = new Intl.DateTimeFormat('en-GB', options);
  const parts = formatter.formatToParts(date);

  const year = parts.find((p) => p.type === 'year')?.value || '0000';
  const month = parts.find((p) => p.type === 'month')?.value || '00';
  const day = parts.find((p) => p.type === 'day')?.value || '00';
  return `${year}-${month}-${day}`;
}

function buildZipName(report) {
  const dateStr = report?.submittedAt
    ? getBahrainDateString(new Date(report.submittedAt))
    : getBahrainDateString();
  const code = sanitizeFileName(report?.propertyCode || 'Report');
  const name = sanitizeFileName(report?.propertyName || 'Property');
  return `${code} - ${name} - ${dateStr}.zip`;
}

function pickUploadedPdf(files) {
  const f = (files || []).find(
    (x) => x?.fieldname === 'reportPdf' && x?.mimetype === 'application/pdf' && x?.buffer?.length
  );
  return f?.buffer || null;
}

function parseFindingIndex(field) {
  // Supports:
  // - findingPhotos__0 (zero-based)
  // - findingPhotos_1 (one-based legacy)
  if (field.startsWith('findingPhotos__')) {
    const idxRaw = field.split('__')[1];
    const idx = Number(idxRaw);
    return Number.isFinite(idx) ? idx : null;
  }

  if (field.startsWith('findingPhotos_')) {
    const idxRaw = field.split('_')[1];
    const oneBased = Number(idxRaw);
    if (!Number.isFinite(oneBased)) return null;
    return Math.max(0, oneBased - 1);
  }

  return null;
}

/**
 * Expected frontend file fields:
 * - reportPdf (single)  <-- client-generated PDF (same as Print -> Save as PDF)
 * - mainPhotos (multiple)
 * - findingPhotos__<index> (multiple) OR findingPhotos_<index+1> (legacy)
 * - complaintFiles (multiple)
 */
export async function generateZipBundle({ report, files }) {
  const zip = new JSZip();

  // 1) Add PDF to ZIP:
  // Prefer client PDF (same as Print), fallback to Playwright
  let pdfBuffer = pickUploadedPdf(files);
  if (!pdfBuffer) {
    pdfBuffer = await generatePdfBuffer(report);
  }

  const dateStr = report?.submittedAt
    ? getBahrainDateString(new Date(report.submittedAt))
    : getBahrainDateString();

  const pdfName = sanitizeFileName(
    `${report?.propertyCode || 'Report'} - ${report?.propertyName || 'Property'} - ${dateStr}.pdf`
  );

  zip.folder('PDF')?.file(pdfName, pdfBuffer);

  // 2) Add metadata
  zip.file('Report.json', JSON.stringify(report, null, 2));

  // 3) Add files into structured folders
  const mainFolder = zip.folder('Main Photos');
  const findingsRoot = zip.folder('Findings');
  const complaintFolder = zip.folder('Complaint Files');

  const findings = Array.isArray(report?.findings) ? report.findings : [];

  for (const f of files || []) {
    const field = f.fieldname || '';
    const original = sanitizeFileName(f.originalname || 'file');
    const buf = f.buffer;

    if (!buf || !buf.length) continue;

    // Skip the uploaded PDF attachment itself (already placed in PDF folder)
    if (field === 'reportPdf') continue;

    if (field === 'mainPhotos') {
      mainFolder?.file(original, buf);
      continue;
    }

    if (field === 'complaintFiles') {
      complaintFolder?.file(original, buf);
      continue;
    }

    const idx = parseFindingIndex(field);
    if (idx !== null) {
      const findingNumber = idx + 1;

      const findingText = safeStr(findings?.[idx]?.text || '')
        .substring(0, 50)
        .trim();

      const folderName = sanitizeFileName(`Finding ${findingNumber} - ${findingText || 'No Description'}`);

      findingsRoot?.folder(folderName)?.file(original, buf);
      continue;
    }

    // Unknown field: put it in Misc
    zip.folder('Misc')?.file(original, buf);
  }

  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return {
    zipBuffer,
    zipFileName: buildZipName(report),
  };
}
