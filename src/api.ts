import {
  Property,
  PropertySearchResponse,
  PropertyReport,
  ReportSubmitResponse,
  UploadResponse,
} from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

async function parseErrorMessage(response: Response): Promise<string> {
  let message = response.statusText;
  try {
    const err = await response.json();
    message = err?.message || err?.error || message;
  } catch {
    // ignore
  }
  return message;
}

/**
 * Search for properties by name/code/area/governorate/postcode
 * GET /api/properties?search=<query>
 */
export async function searchProperties(query: string): Promise<Property[]> {
  const q = query.trim();
  if (!q) return [];

  const response = await fetch(
    `${API_BASE_URL}/properties?search=${encodeURIComponent(q)}`
  );

  if (!response.ok) {
    const message = await parseErrorMessage(response);
    throw new Error(`Search failed: ${message}`);
  }

  const data: PropertySearchResponse = await response.json();
  return Array.isArray(data.properties) ? data.properties : [];
}

/**
 * Upload a file to Google Drive
 * POST /api/upload
 */
export async function uploadFile(
  file: File,
  propertyCode: string,
  propertyType: string,
  endowedTo: string,
  subfolder?: string
): Promise<UploadResponse> {
  if (!propertyCode) {
    throw new Error('Property code is required for upload');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('propertyCode', propertyCode);
  formData.append('propertyType', propertyType || '');
  formData.append('endowedTo', endowedTo || '');
  if (subfolder) formData.append('subfolder', subfolder);

  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const message = await parseErrorMessage(response);
    throw new Error(`Upload failed: ${message}`);
  }

  const data: UploadResponse = await response.json();
  return data;
}

/**
 * Submit a complete property report
 * POST /api/reports
 */
export async function submitReport(
  report: PropertyReport
): Promise<ReportSubmitResponse> {
  const response = await fetch(`${API_BASE_URL}/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(report),
  });

  if (!response.ok) {
    const message = await parseErrorMessage(response);
    throw new Error(`Report submission failed: ${message}`);
  }

  const data: ReportSubmitResponse = await response.json();
  return data;
}

/**
 * Generate exports (PDF + ZIP) on the backend and upload to Drive
 * POST /api/reports/:id/exports
 */
export async function generateReportExports(reportId: string): Promise<any> {
  if (!reportId) throw new Error('reportId is required');

  const response = await fetch(`${API_BASE_URL}/reports/${encodeURIComponent(reportId)}/exports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const message = await parseErrorMessage(response);
    throw new Error(`Exports generation failed: ${message}`);
  }

  return await response.json();
}

/**
 * Get exports (best-effort) for a report
 * GET /api/reports/:id/exports
 */
export async function getReportExports(reportId: string): Promise<any> {
  if (!reportId) throw new Error('reportId is required');

  const response = await fetch(`${API_BASE_URL}/reports/${encodeURIComponent(reportId)}/exports`);

  if (!response.ok) {
    const message = await parseErrorMessage(response);
    throw new Error(`Failed to fetch exports: ${message}`);
  }

  return await response.json();
}
