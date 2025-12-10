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
  const element = document.getElementById(elementId);

  if (!element) {
    throw new Error(`Element with ID "${elementId}" not found`);
  }

  const filename = generatePdfFilename(report);

  // Configure html2pdf options
  const options = {
    margin: [10, 10, 10, 10], // [top, right, bottom, left] in mm
    filename: filename,
    image: { type: 'jpeg', quality: 0.85 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      letterRendering: true,
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
      compress: true,
    },
    pagebreak: {
      mode: ['avoid-all', 'css', 'legacy'],
    },
  };

  // Generate and download PDF
  try {
    await html2pdf().set(options).from(element).save();
  } catch (error) {
    console.error('PDF generation error:', error);
    throw new Error('Failed to generate PDF. Please try again.');
  }
}

/**
 * Validate if report has minimum required fields for PDF generation
 * @param report - Property report
 * @returns Error message if validation fails, null if valid
 */
export function validateReportForPdf(report: PropertyReport | null): string | null {
  if (!report) {
    return 'No report data available';
  }

  if (!report.propertyCode || !report.propertyName) {
    return 'Property code and name are required';
  }

  if (!report.visitType) {
    return 'Visit type is required';
  }

  return null;
}
