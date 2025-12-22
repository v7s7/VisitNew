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
 * Print report (user can save as PDF from browser's print dialog)
 * @param report - Property report to print
 * @returns Promise that resolves when print dialog is opened
 */
export async function printReport(report: PropertyReport): Promise<void> {
  console.log('🖨️ Opening print dialog...');

  // Set document title for PDF filename suggestion
  const filename = generatePdfFilename(report);
  const originalTitle = document.title;
  document.title = filename;

  try {
    // Open browser's native print dialog
    window.print();
    console.log('✅ Print dialog opened');
  } finally {
    // Restore original title after a delay
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
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
