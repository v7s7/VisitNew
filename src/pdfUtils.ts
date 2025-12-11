import html2pdf from 'html2pdf.js';
import { PropertyReport } from './types';

/**
 * Format date in Bahrain timezone
 * @param date - Date to format (defaults to current date)
 * @returns Formatted date string in Bahrain timezone
 */
export function formatBahrainDate(date: Date = new Date()): string {
  // Format: YYYY-MM-DD HH:mm (Asia/Bahrain)
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Bahrain',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  };

  const formatter = new Intl.DateTimeFormat('en-GB', options);
  const parts = formatter.formatToParts(date);

  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  const hour = parts.find((p) => p.type === 'hour')?.value;
  const minute = parts.find((p) => p.type === 'minute')?.value;

  return `${year}-${month}-${day} ${hour}:${minute} (Asia/Bahrain)`;
}

/**
 * Get date in YYYY-MM-DD format for Bahrain timezone
 * @param date - Date to format (defaults to current date)
 * @returns Date string in YYYY-MM-DD format
 */
export function getBahrainDateString(date: Date = new Date()): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Bahrain',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };

  const formatter = new Intl.DateTimeFormat('en-GB', options);
  const parts = formatter.formatToParts(date);

  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;

  return `${year}-${month}-${day}`;
}

/**
 * Sanitize filename by removing invalid characters
 * @param filename - Filename to sanitize
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  // Remove or replace invalid filename characters: / \ : * ? " < > |
  return filename
    .replace(/[/\\:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generate PDF filename in the required format
 * Format: "<propertyCode> - <propertyName> - <YYYY-MM-DD>.pdf"
 * @param report - Property report
 * @returns Sanitized PDF filename
 */
export function generatePdfFilename(report: PropertyReport): string {
  const dateString = report.submittedAt
    ? getBahrainDateString(new Date(report.submittedAt))
    : getBahrainDateString();

  const filename = `${report.propertyCode} - ${report.propertyName} - ${dateString}.pdf`;
  return sanitizeFilename(filename);
}

/**
 * Generate and download PDF from a report
 * @param report - Property report to generate PDF from
 * @param elementId - ID of the HTML element to convert to PDF
 * @returns Promise that resolves when PDF generation is complete
 */
export async function generateReportPdf(
  report: PropertyReport,
  elementId: string = 'pdf-content'
): Promise<void> {
  console.log('🔍 Starting PDF generation...');
  const element = document.getElementById(elementId) as HTMLElement;

  if (!element) {
    console.error('❌ Element not found:', elementId);
    throw new Error(`Element with ID "${elementId}" not found`);
  }

  console.log('✓ Element found');
  console.log('📄 Element HTML length:', element.innerHTML.length);

  const filename = generatePdfFilename(report);
  console.log('📝 Filename:', filename);

  // Store original styles
  const originalStyles = {
    position: element.style.position,
    left: element.style.left,
    top: element.style.top,
    width: element.style.width,
    zIndex: element.style.zIndex,
    visibility: element.style.visibility,
  };

  // Make element visible for rendering
  element.style.position = 'fixed';
  element.style.left = '0';
  element.style.top = '0';
  element.style.width = '210mm';
  element.style.zIndex = '9999';
  element.style.visibility = 'visible';
  console.log('✓ Element made visible');

  // Give browser time to render
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Wait for images to load
  const images = element.getElementsByTagName('img');
  console.log('🖼️ Found', images.length, 'images');

  const imagePromises = Array.from(images).map((img, index) => {
    if (img.complete && img.naturalHeight !== 0) {
      console.log(`✓ Image ${index + 1} already loaded`);
      return Promise.resolve();
    }
    console.log(`⏳ Waiting for image ${index + 1} to load...`);
    return new Promise((resolve) => {
      img.onload = () => {
        console.log(`✓ Image ${index + 1} loaded`);
        resolve(null);
      };
      img.onerror = () => {
        console.log(`⚠️ Image ${index + 1} failed to load`);
        resolve(null);
      };
      setTimeout(() => {
        console.log(`⏱️ Image ${index + 1} timeout`);
        resolve(null);
      }, 5000);
    });
  });

  await Promise.all(imagePromises);
  console.log('✓ All images processed');

  // Additional delay to ensure everything is rendered
  await new Promise(resolve => setTimeout(resolve, 500));

  // Configure html2pdf options
  const options = {
    margin: [10, 10, 10, 10],
    filename: filename,
    image: {
      type: 'jpeg',
      quality: 0.95
    },
    html2canvas: {
      scale: 2,
      logging: true,
      letterRendering: true,
      allowTaint: false,
      useCORS: false,
      backgroundColor: '#ffffff',
      windowWidth: 794, // A4 width in pixels at 96 DPI
      windowHeight: 1123, // A4 height in pixels at 96 DPI
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
    },
  };

  console.log('⚙️ Starting html2pdf conversion...');

  // Generate and download PDF
  try {
    await html2pdf().set(options).from(element).save();
    console.log('✅ PDF generated successfully!');
  } catch (error) {
    console.error('❌ PDF generation error:', error);
    throw new Error('Failed to generate PDF. Please try again.');
  } finally {
    // Restore original styles
    element.style.position = originalStyles.position;
    element.style.left = originalStyles.left;
    element.style.top = originalStyles.top;
    element.style.width = originalStyles.width;
    element.style.zIndex = originalStyles.zIndex;
    element.style.visibility = originalStyles.visibility;
    console.log('✓ Element hidden again');
  }
}

/**
 * Validate if report has minimum required fields for PDF generation
 * @param report - Property report
 * @returns Error message if validation fails, null if valid
 */
export function validateReportForPdf(report: PropertyReport | null): string | null {
  if (!report) {
    return 'يرجى اختيار عقار أولاً | Please select a property first';
  }

  // All fields are optional - PDF will show whatever is available
  // No validation errors - always allow PDF generation if property is selected
  return null;
}
