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
  const dateStr = report?.submittedAt ? getBahrainDateString(new Date(report.submittedAt)) : getBahrainDateString();
  const code = sanitizeFileName(report?.propertyCode || 'Report');
  const name = sanitizeFileName(report?.propertyName || 'Property');
  return `${code} - ${name} - ${dateStr}.zip`;
}

/**
 * Expected frontend file fields:
 * - mainPhotos (multiple)
 * - findingPhotos__<index> (multiple)  e.g. findingPhotos__0, findingPhotos__1
 * - complaintFiles (multiple)
 *
 * Multer file object: { fieldname, originalname, buffer, mimetype }
 */
export async function generateZipBundle({ report, files }) {
  const zip = new JSZip();

  // 1) Generate PDF (server-side) and add it to ZIP
  const pdfBuffer = await generatePdfBuffer(report);
  const dateStr = report?.submittedAt ? getBahrainDateString(new Date(report.submittedAt)) : getBahrainDateString();
  const pdfName = sanitizeFileName(`${report?.propertyCode || 'Report'} - ${report?.propertyName || 'Property'} - ${dateStr}.pdf`);
  zip.folder('PDF')?.file(pdfName, pdfBuffer);

  // 2) Add metadata
  zip.file('Report.json', JSON.stringify(report, null, 2));

  // 3) Add files into structured folders
  const mainFolder = zip.folder('Main Photos');
  const findingsRoot = zip.folder('Findings');
  const complaintFolder = zip.folder('Complaint Files');

  const findings = Array.isArray(report?.findings) ? report.findings : [];

  for (const f of files) {
    const field = f.fieldname || '';
    const original = sanitizeFileName(f.originalname || 'file');
    const buf = f.buffer;

    if (field === 'mainPhotos') {
      mainFolder?.file(original, buf);
      continue;
    }

    if (field === 'complaintFiles') {
      complaintFolder?.file(original, buf);
      continue;
    }

    // findingPhotos__0, findingPhotos__1, ...
    if (field.startsWith('findingPhotos__')) {
      const idxRaw = field.split('__')[1];
      const idx = Number(idxRaw);
      const findingNumber = Number.isFinite(idx) ? idx + 1 : 0;

      const findingText = safeStr(findings?.[idx]?.text || '').substring(0, 50).trim();
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
