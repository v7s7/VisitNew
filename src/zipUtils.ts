import JSZip from 'jszip';
import { PropertyReport } from './types';
import { sanitizeFilename, getBahrainDateString } from './pdfUtils';

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Fetch file from URL or File object and return as blob
 */
async function getFileBlob(file: File, url?: string): Promise<Blob> {
  if (url) {
    try {
      const response = await fetch(url);
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
  const name = file.name;
  const lastDot = name.lastIndexOf('.');
  if (lastDot > 0) return name.substring(lastDot);

  const mimeType = file.type;
  if (mimeType.startsWith('image/')) return '.' + mimeType.split('/')[1];
  return '';
}

/**
 * Generate a PDF blob from the hidden PDF DOM (#pdf-content)
 * This avoids relying on window.print().
 */
async function generatePdfBlobFromDom(): Promise<Blob> {
  const el = document.getElementById('pdf-content');
  if (!el) {
    throw new Error('PDF content not found (missing #pdf-content).');
  }

  // Temporarily show it for rendering
  const prevDisplay = el.style.display;
  el.style.display = 'block';

  try {
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      windowWidth: document.documentElement.clientWidth,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Fit image to A4 width, paginate by height
    const imgProps = pdf.getImageProperties(imgData);
    const imgWidth = pageWidth;
    const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

    let positionY = 0;
    let remaining = imgHeight;

    while (remaining > 0) {
      pdf.addImage(imgData, 'PNG', 0, positionY, imgWidth, imgHeight);
      remaining -= pageHeight;

      if (remaining > 0) {
        pdf.addPage();
        positionY -= pageHeight; // shift up for next “slice”
      }
    }

    return pdf.output('blob');
  } finally {
    el.style.display = prevDisplay;
  }
}

/**
 * Download all uploaded files from a property report as a ZIP file
 * ✅ Includes the PDF report inside the ZIP
 */
export async function downloadReportZip(report: PropertyReport): Promise<void> {
  const zip = new JSZip();
  let fileCount = 0;

  // 1) Add PDF report
  try {
    const dateOnly = getBahrainDateString();
    const pdfName = sanitizeFilename(`Report - ${report.propertyCode} - ${dateOnly}.pdf`);
    const pdfBlob = await generatePdfBlobFromDom();
    zip.file(pdfName, pdfBlob);
    fileCount++;
  } catch (e) {
    console.error('Failed to generate PDF for ZIP:', e);
    // If you want to hard-fail when PDF fails, uncomment:
    // throw new Error('Failed to generate PDF report for ZIP');
  }

  // 2) Add main photos
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

  // 3) Add finding photos
  if (report.findings.length > 0) {
    for (let findingIndex = 0; findingIndex < report.findings.length; findingIndex++) {
      const finding = report.findings[findingIndex];
      if (finding.photos.length > 0) {
        const findingNumber = findingIndex + 1;
        const findingDescription = (finding.text || '').substring(0, 50).trim();
        const folderName = sanitizeFilename(`Finding${findingNumber} - ${findingDescription}`);

        const findingFolder = zip.folder(folderName);
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

  // 4) Add complaint files
  if (report.complaintFiles.length > 0) {
    const complaintFolder = zip.folder('Complaint Files');
    if (complaintFolder) {
      for (let i = 0; i < report.complaintFiles.length; i++) {
        const file = report.complaintFiles[i];
        if (file.uploadedUrl || file.file) {
          try {
            const blob = await getFileBlob(file.file, file.uploadedUrl);
            const fileName = sanitizeFilename(file.name);
            complaintFolder.file(fileName, blob);
            fileCount++;
          } catch (error) {
            console.error(`Failed to add complaint file ${i + 1}:`, error);
          }
        }
      }
    }
  }

  if (fileCount === 0) {
    throw new Error('لا توجد ملفات للتحميل | No files to download');
  }

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const dateString = getBahrainDateString();
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

  console.log(`✅ ZIP file downloaded: ${fileCount} files (including PDF)`);
}

/**
 * Validate if report has anything to download
 */
export function validateReportForZip(report: PropertyReport | null): string | null {
  if (!report) {
    return 'يرجى اختيار عقار أولاً | Please select a property first';
  }

  const hasAnyFiles =
    report.mainPhotos.length > 0 ||
    report.findings.some((f) => f.photos.length > 0) ||
    report.complaintFiles.length > 0;

  const hasAnyText =
    !!report.visitType?.trim() ||
    !!report.locationDescription?.trim() ||
    !!report.locationLink?.trim() ||
    !!report.additionalNotes?.trim() ||
    !!report.complaint?.trim() ||
    report.findings.some((f) => (f.text || '').trim()) ||
    report.actions.some((a) => (a.text || '').trim());

  if (!hasAnyFiles && !hasAnyText) {
    return 'لا توجد بيانات أو ملفات للتحميل | No data or files to download';
  }

  return null;
}
