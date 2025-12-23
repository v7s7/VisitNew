import JSZip from 'jszip';
import { PropertyReport } from './types';
import {
  sanitizeFilename,
  getBahrainDateString,
  generatePdfFilename,
} from './pdfUtils';
import html2pdf from 'html2pdf.js';

/**
 * Fetch file from URL or File object and return as blob
 */
async function getFileBlob(file: File, url?: string): Promise<Blob> {
  if (url) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.blob();
    } catch (error) {
      console.warn('Failed to fetch from URL, using local file:', error);
    }
  }
  return file;
}

/**
 * Get file extension from filename or file type
 */
function getFileExtension(file: File): string {
  const name = file.name || '';
  const lastDot = name.lastIndexOf('.');
  if (lastDot > 0) return name.substring(lastDot);

  const mimeType = file.type || '';
  if (mimeType.startsWith('image/')) return '.' + mimeType.split('/')[1];
  if (mimeType === 'application/pdf') return '.pdf';
  if (mimeType === 'text/plain') return '.txt';
  return '';
}

/**
 * Generate a PDF blob from the hidden DOM element (#pdf-content)
 * Uses html2pdf (html2canvas + jsPDF) without triggering print mode.
 */
async function generatePdfBlobFromDom(
  report: PropertyReport
): Promise<{ blob: Blob; filename: string }> {
  const el = document.getElementById('pdf-content') as HTMLElement | null;
  if (!el) {
    throw new Error('PDF content not found (element #pdf-content).');
  }

  // IMPORTANT: if your CSS uses display:none, canvas capture may be blank.
  // So we temporarily render it offscreen.
  const prev = {
    display: el.style.display,
    position: el.style.position,
    left: el.style.left,
    top: el.style.top,
    width: el.style.width,
    height: el.style.height,
    opacity: el.style.opacity,
    pointerEvents: el.style.pointerEvents,
    zIndex: el.style.zIndex,
  };

  el.style.display = 'block';
  el.style.position = 'fixed';
  el.style.left = '-99999px';
  el.style.top = '0';
  el.style.width = '794px'; // ~A4 width at 96dpi (helps stability)
  el.style.height = 'auto';
  el.style.opacity = '1';
  el.style.pointerEvents = 'none';
  el.style.zIndex = '0';

  try {
    // Let layout settle before capture
    await new Promise((r) => requestAnimationFrame(() => r(null)));

    const filename = generatePdfFilename(report);

    const opt = {
      margin: 10,
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };

    // html2pdf types are loose; treat worker as any
    const worker = (html2pdf() as any).set(opt).from(el);

    // outputPdf('blob') gives a Blob
    const blob: Blob = await worker.outputPdf('blob');

    return { blob, filename };
  } finally {
    el.style.display = prev.display;
    el.style.position = prev.position;
    el.style.left = prev.left;
    el.style.top = prev.top;
    el.style.width = prev.width;
    el.style.height = prev.height;
    el.style.opacity = prev.opacity;
    el.style.pointerEvents = prev.pointerEvents;
    el.style.zIndex = prev.zIndex;
  }
}

/**
 * Download all uploaded files from a property report as a ZIP file
 * PLUS: include a generated PDF report inside the ZIP
 */
export async function downloadReportZip(report: PropertyReport): Promise<void> {
  const zip = new JSZip();
  let fileCount = 0;

  // ----------------------------
  // 1) Add PDF inside ZIP
  // ----------------------------
  {
    const pdfFolder = zip.folder('PDF Report');
    const { blob, filename } = await generatePdfBlobFromDom(report);
    pdfFolder?.file(filename, blob);
    fileCount++;
  }

  // ----------------------------
  // 2) Add main photos
  // ----------------------------
  if (report.mainPhotos.length > 0) {
    const mainPhotosFolder = zip.folder('Main Photos');
    if (mainPhotosFolder) {
      for (let i = 0; i < report.mainPhotos.length; i++) {
        const photo = report.mainPhotos[i];
        if (photo.uploadedUrl || photo.file) {
          try {
            const blob = await getFileBlob(photo.file, photo.uploadedUrl);
            const ext = getFileExtension(photo.file);
            const fileName = `Main Photo ${i + 1}${ext}`;
            mainPhotosFolder.file(fileName, blob);
            fileCount++;
          } catch (error) {
            console.error(`Failed to add main photo ${i + 1}:`, error);
          }
        }
      }
    }
  }

  // ----------------------------
  // 3) Add finding photos
  // ----------------------------
  if (report.findings.length > 0) {
    const findingsRoot = zip.folder('Findings');
    for (let findingIndex = 0; findingIndex < report.findings.length; findingIndex++) {
      const finding = report.findings[findingIndex];
      if (finding.photos.length > 0) {
        const findingNumber = findingIndex + 1;
        const findingDescription = (finding.text || '').substring(0, 50).trim();
        const folderName = sanitizeFilename(`Finding ${findingNumber} - ${findingDescription || 'No Description'}`);

        const findingFolder = findingsRoot?.folder(folderName);
        if (findingFolder) {
          for (let photoIndex = 0; photoIndex < finding.photos.length; photoIndex++) {
            const photo = finding.photos[photoIndex];
            if (photo.uploadedUrl || photo.file) {
              try {
                const blob = await getFileBlob(photo.file, photo.uploadedUrl);
                const ext = getFileExtension(photo.file);
                const fileName = `Photo ${photoIndex + 1}${ext}`;
                findingFolder.file(fileName, blob);
                fileCount++;
              } catch (error) {
                console.error(
                  `Failed to add finding ${findingNumber} photo ${photoIndex + 1}:`,
                  error
                );
              }
            }
          }
        }
      }
    }
  }

  // ----------------------------
  // 4) Add complaint files
  // ----------------------------
  if (report.complaintFiles.length > 0) {
    const complaintFolder = zip.folder('Complaint Files');
    if (complaintFolder) {
      for (let i = 0; i < report.complaintFiles.length; i++) {
        const file = report.complaintFiles[i];
        if (file.uploadedUrl || file.file) {
          try {
            const blob = await getFileBlob(file.file, file.uploadedUrl);
            const fileName = sanitizeFilename(file.name || `Complaint File ${i + 1}${getFileExtension(file.file)}`);
            complaintFolder.file(fileName, blob);
            fileCount++;
          } catch (error) {
            console.error(`Failed to add complaint file ${i + 1}:`, error);
          }
        }
      }
    }
  }

  // Must have at least the PDF (we always add it if pdf-content exists)
  if (fileCount === 0) {
    throw new Error('لا توجد ملفات للتحميل | No files to download');
  }

  // ----------------------------
  // 5) Generate ZIP file
  // ----------------------------
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  // ZIP file name
  const dateString = report.submittedAt
    ? getBahrainDateString(new Date(report.submittedAt))
    : getBahrainDateString();

  const zipFileName = sanitizeFilename(
    `${report.propertyCode} - ${report.propertyName} - ${dateString}.zip`
  );

  const url = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = zipFileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  console.log(`✅ ZIP file downloaded: ${fileCount} files`);
}

/**
 * Validate if report has files to download
 * NOTE: PDF is generated from DOM; we validate that the report exists and a property is selected.
 */
export function validateReportForZip(report: PropertyReport | null): string | null {
  if (!report) {
    return 'يرجى اختيار عقار أولاً | Please select a property first';
  }

  // We always include PDF (if #pdf-content exists), so allow ZIP even if no files.
  // But if you want to enforce photos/files, uncomment below:
  //
  // const hasMainPhotos = report.mainPhotos.length > 0;
  // const hasFindingPhotos = report.findings.some((f) => f.photos.length > 0);
  // const hasComplaintFiles = report.complaintFiles.length > 0;
  // if (!hasMainPhotos && !hasFindingPhotos && !hasComplaintFiles) {
  //   return 'لا توجد ملفات لتحميلها | No files to download';
  // }

  return null;
}
