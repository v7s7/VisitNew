import JSZip from 'jszip';
import { PropertyReport } from './types';
import { sanitizeFilename, getBahrainDateString, generatePdfFilename } from './pdfUtils';

async function safeFetchBlob(url: string): Promise<Blob | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.blob();
  } catch {
    return null;
  }
}

function getFileExtensionFromName(name?: string): string {
  const n = (name || '').trim();
  const dot = n.lastIndexOf('.');
  return dot > 0 ? n.substring(dot) : '';
}

function getFileExtensionFromMime(mime?: string): string {
  const m = (mime || '').trim();
  if (!m) return '';
  if (m.startsWith('image/')) return '.' + m.split('/')[1];
  if (m === 'application/pdf') return '.pdf';
  if (m === 'text/plain') return '.txt';
  return '';
}

function safeArray<T>(v: any): T[] {
  return Array.isArray(v) ? v : [];
}

function buildReportText(report: PropertyReport): string {
  const lines: string[] = [];

  lines.push('VisitProp Report');
  lines.push(`Date: ${getBahrainDateString(report.submittedAt ? new Date(report.submittedAt) : new Date())}`);
  lines.push('');
  lines.push(`Property Code: ${report.propertyCode || ''}`);
  lines.push(`Property Name: ${report.propertyName || ''}`);
  lines.push(`Property ID: ${report.propertyId || ''}`);
  lines.push('');
  lines.push('Details:');
  lines.push(`- Waqf Type: ${report.waqfType || ''}`);
  lines.push(`- Property Type: ${report.propertyType || ''}`);
  lines.push(`- Endowed To: ${report.endowedTo || ''}`);
  lines.push(`- Building: ${report.building || ''}`);
  lines.push(`- Unit Number: ${report.unitNumber || ''}`);
  lines.push(`- Road: ${report.road || ''}`);
  lines.push(`- Area: ${report.area || ''}`);
  lines.push(`- Governorate: ${report.governorate || ''}`);
  lines.push(`- Block: ${report.block || ''}`);
  lines.push('');
  lines.push('Location:');
  lines.push(`- Description: ${report.locationDescription || ''}`);
  lines.push(`- Link: ${report.locationLink || ''}`);
  lines.push('');
  lines.push('Visit:');
  lines.push(`- Type: ${report.visitType || ''}`);
  lines.push(`- Complaint: ${report.complaint || ''}`);
  lines.push('');
  lines.push('Findings:');
  const findings = safeArray<any>(report.findings);
  if (findings.length === 0) {
    lines.push('- (none)');
  } else {
    findings.forEach((f, i) => lines.push(`- ${i + 1}) ${f?.text || ''}`));
  }
  lines.push('');
  lines.push('Actions:');
  const actions = safeArray<any>(report.actions);
  if (actions.length === 0) {
    lines.push('- (none)');
  } else {
    actions.forEach((a, i) => lines.push(`- ${i + 1}) ${a?.text || ''}`));
  }

  return lines.join('\n');
}

/**
 * Download report bundle as ZIP (never crashes).
 * Includes:
 * - Report.txt
 * - Report.json
 * - (optional) photos/files if present
 *
 * NOTE: Browser cannot automatically "save PDF then inject into ZIP".
 * If you want PDF inside ZIP, you must generate PDF as a Blob (jsPDF/html2pdf)
 * or generate it on backend. For now we include filenames + metadata safely.
 */
export async function downloadReportZip(report: PropertyReport): Promise<void> {
  const zip = new JSZip();

  // Always add report metadata so ZIP is never empty.
  zip.file('Report.txt', buildReportText(report));
  zip.file('Report.json', JSON.stringify(report, null, 2));

  // Add a note about PDF filename (helpful even without generating a PDF blob)
  zip.file(
    'PDF_FILENAME_SUGGESTION.txt',
    `Suggested PDF filename:\n${generatePdfFilename(report)}\n\nTo include an actual PDF inside ZIP, generate PDF as a Blob (client-side) or via backend.`
  );

  // Main Photos
  const mainPhotos = safeArray<any>(report.mainPhotos);
  if (mainPhotos.length > 0) {
    const folder = zip.folder('Main Photos');
    if (folder) {
      for (let i = 0; i < mainPhotos.length; i++) {
        const p = mainPhotos[i];
        const url: string | undefined = p?.uploadedUrl;
        const file: File | undefined = p?.file;

        const blob =
          (url ? await safeFetchBlob(url) : null) ||
          (file ? file : null);

        if (!blob) continue;

        const ext =
          getFileExtensionFromName(file?.name) ||
          getFileExtensionFromMime((blob as any)?.type) ||
          '.bin';

        folder.file(`Main Photo ${i + 1}${ext}`, blob);
      }
    }
  }

  // Finding Photos
  const findings = safeArray<any>(report.findings);
  for (let fi = 0; fi < findings.length; fi++) {
    const f = findings[fi];
    const photos = safeArray<any>(f?.photos);
    if (photos.length === 0) continue;

    const findingNumber = fi + 1;
    const desc = String(f?.text || '').substring(0, 50).trim();
    const folderName = sanitizeFilename(`Finding ${findingNumber} - ${desc || 'No Description'}`);
    const folder = zip.folder(folderName);
    if (!folder) continue;

    for (let pi = 0; pi < photos.length; pi++) {
      const p = photos[pi];
      const url: string | undefined = p?.uploadedUrl;
      const file: File | undefined = p?.file;

      const blob =
        (url ? await safeFetchBlob(url) : null) ||
        (file ? file : null);

      if (!blob) continue;

      const ext =
        getFileExtensionFromName(file?.name) ||
        getFileExtensionFromMime((blob as any)?.type) ||
        '.bin';

      folder.file(`Photo ${pi + 1}${ext}`, blob);
    }
  }

  // Complaint Files
  const complaintFiles = safeArray<any>(report.complaintFiles);
  if (complaintFiles.length > 0) {
    const folder = zip.folder('Complaint Files');
    if (folder) {
      for (let i = 0; i < complaintFiles.length; i++) {
        const f = complaintFiles[i];
        const url: string | undefined = f?.uploadedUrl;
        const file: File | undefined = f?.file;
        const name: string = f?.name || file?.name || `Complaint File ${i + 1}`;

        const blob =
          (url ? await safeFetchBlob(url) : null) ||
          (file ? file : null);

        if (!blob) continue;

        const ext =
          getFileExtensionFromName(name) ||
          getFileExtensionFromName(file?.name) ||
          getFileExtensionFromMime((blob as any)?.type) ||
          '.bin';

        folder.file(sanitizeFilename(name.replace(/\.[^/.]+$/, '') + ext), blob);
      }
    }
  }

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const dateString = getBahrainDateString(report.submittedAt ? new Date(report.submittedAt) : new Date());
  const zipFileName = sanitizeFilename(`${report.propertyCode || 'Report'} - ${report.propertyName || 'Property'} - ${dateString}.zip`);

  const url = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = zipFileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Make everything optional: only require selecting a property (report object).
 */
export function validateReportForZip(report: PropertyReport | null): string | null {
  if (!report) return 'يرجى اختيار عقار أولاً | Please select a property first';
  return null;
}
