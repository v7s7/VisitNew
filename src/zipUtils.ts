import JSZip from 'jszip';
import html2pdf from 'html2pdf.js';
import { PropertyReport } from './types';
import { sanitizeFilename, getBahrainDateString, generatePdfFilename, formatBahrainDate } from './pdfUtils';

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
  if (lastDot > 0) {
    return name.substring(lastDot);
  }
  // Fallback to MIME type
  const mimeType = file.type;
  if (mimeType.startsWith('image/')) {
    return '.' + mimeType.split('/')[1];
  }
  return '';
}

/**
 * Generate PDF blob from report
 */
async function generatePdfBlob(report: PropertyReport): Promise<Blob> {
  // Get the PDF content element
  const element = document.getElementById('pdf-content');
  if (!element) {
    throw new Error('PDF content element not found');
  }

  const pdfFilename = generatePdfFilename(report);

  const options = {
    margin: [10, 10, 10, 10],
    filename: pdfFilename,
    image: {
      type: 'jpeg',
      quality: 0.95
    },
    html2canvas: {
      scale: 2,
      useCORS: false,
      logging: false,
      letterRendering: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      windowWidth: 794,
      windowHeight: 1123,
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
    },
  };

  // Generate PDF and return as blob
  const pdf = await html2pdf().set(options).from(element).output('blob');
  return pdf;
}

/**
 * Download all uploaded files from a property report as a ZIP file
 * @param report - Property report containing uploaded files
 */
export async function downloadReportZip(report: PropertyReport): Promise<void> {
  const zip = new JSZip();
  let fileCount = 0;

  // Generate and add PDF report
  try {
    console.log('📄 Generating PDF for ZIP...');
    const pdfBlob = await generatePdfBlob(report);
    const pdfFilename = generatePdfFilename(report);
    zip.file(pdfFilename, pdfBlob);
    fileCount++;
    console.log('✓ PDF added to ZIP');
  } catch (error) {
    console.error('Failed to generate PDF for ZIP:', error);
    // Continue even if PDF generation fails
  }

  // Add main photos
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

  // Add finding photos
  if (report.findings.length > 0) {
    for (let findingIndex = 0; findingIndex < report.findings.length; findingIndex++) {
      const finding = report.findings[findingIndex];
      if (finding.photos.length > 0) {
        // Create folder name: "Finding1 - [description]"
        const findingNumber = findingIndex + 1;
        const findingDescription = finding.text.substring(0, 50).trim();
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
                console.error(`Failed to add finding ${findingNumber} photo ${photoIndex + 1}:`, error);
              }
            }
          }
        }
      }
    }
  }

  // Add complaint files
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

  // Check if there are any files to download
  if (fileCount === 0) {
    throw new Error('لا توجد ملفات للتحميل | No files to download');
  }

  // Generate ZIP file
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  // Create download link
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

  console.log(`✅ ZIP file downloaded: ${fileCount} files`);
}

/**
 * Validate if report has files to download
 */
export function validateReportForZip(report: PropertyReport | null): string | null {
  if (!report) {
    return 'يرجى اختيار عقار أولاً | Please select a property first';
  }

  const hasMainPhotos = report.mainPhotos.length > 0;
  const hasFindingPhotos = report.findings.some(f => f.photos.length > 0);
  const hasComplaintFiles = report.complaintFiles.length > 0;

  if (!hasMainPhotos && !hasFindingPhotos && !hasComplaintFiles) {
    return 'لا توجد ملفات لتحميلها | No files to download';
  }

  return null;
}
