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

function defaultPdfName(report) {
  const dateStr = report?.submittedAt ? getBahrainDateString(new Date(report.submittedAt)) : getBahrainDateString();
  const code = sanitizeFileName(report?.propertyCode || 'Report');
  const name = sanitizeFileName(report?.propertyName || 'Property');
  return `${code} - ${name} - ${dateStr}.pdf`;
}

async function getChromium() {
  try {
    const mod = await import('playwright');
    if (mod?.chromium) return mod.chromium;
  } catch {}
  try {
    const mod = await import('playwright-chromium');
    if (mod?.chromium) return mod.chromium;
  } catch {}
  throw new Error('Playwright chromium not available. Install playwright or playwright-chromium on backend.');
}

async function generatePdfBufferFromHtml(html) {
  const chromium = await getChromium();
  const browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    // Print CSS mode (matches window.print behavior)
    try {
      await page.emulateMedia({ media: 'print' });
    } catch {}
    try {
      await page.emulateMediaType('print');
    } catch {}

    await page.setContent(html, { waitUntil: 'networkidle' });

    // preferCSSPageSize makes @page rules work like print
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
    });

    return pdfBuffer;
  } finally {
    await browser.close().catch(() => {});
  }
}

function parseFindingIndex(field) {
  // Support BOTH:
  // - findingPhotos__0  (0-based)
  // - findingPhotos_1   (1-based)
  if (field.startsWith('findingPhotos__')) {
    const idxRaw = field.split('__')[1];
    const idx = Number(idxRaw);
    return Number.isFinite(idx) ? idx : null;
  }
  if (field.startsWith('findingPhotos_')) {
    const idxRaw = field.split('_')[1];
    const n = Number(idxRaw);
    if (!Number.isFinite(n)) return null;
    return Math.max(0, n - 1);
  }
  return null;
}

export async function generateZipBundle({ report, files, pdfHtml, pdfFileName }) {
  const zip = new JSZip();

  // 1) PDF (REAL PDF)
  let pdfBuffer;
  if (pdfHtml && String(pdfHtml).trim()) {
    pdfBuffer = await generatePdfBufferFromHtml(String(pdfHtml));
  } else {
    // fallback to your existing backend generator
    pdfBuffer = await generatePdfBuffer(report);
  }

  const pdfName = sanitizeFileName(pdfFileName || defaultPdfName(report));
  zip.folder('PDF')?.file(pdfName, pdfBuffer);

  // NOTE: removed Report.json (you said you don’t want the JSON)

  // 2) Add files into folders
  const mainFolder = zip.folder('Main Photos');
  const findingsRoot = zip.folder('Findings');
  const complaintFolder = zip.folder('Complaint Files');

  const findings = Array.isArray(report?.findings) ? report.findings : [];

  for (const f of files || []) {
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

    const findingIdx = parseFindingIndex(field);
    if (findingIdx !== null) {
      const findingNumber = findingIdx + 1;
      const findingText = safeStr(findings?.[findingIdx]?.text || '').substring(0, 50).trim();
      const folderName = sanitizeFileName(`Finding ${findingNumber} - ${findingText || 'No Description'}`);
      findingsRoot?.folder(folderName)?.file(original, buf);
      continue;
    }

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
