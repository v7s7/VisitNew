import {
  Property,
  PropertySearchResponse,
  PropertyReport,
  ReportSubmitResponse,
  UploadResponse,
} from './types';

// Normalizes base URL and guarantees correct backend prefix:
// - Local/proxy: RAW_BASE="/api"  -> "/api/..."
// - Full URL:   RAW_BASE="https://visitprop.onrender.com" -> "https://visitprop.onrender.com/api/..."
const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').trim();
const API_BASE_URL = RAW_BASE.replace(/\/+$/, ''); // remove trailing "/"

async function parseErrorMessage(response: Response): Promise<string> {
  let message = response.statusText || 'Request failed';

  // Try JSON first
  try {
    const err = await response.clone().json();
    message = err?.message || err?.error || message;
    return message;
  } catch {
    // ignore
  }

  // Then try plain text
  try {
    const text = await response.clone().text();
    if (text && text.trim()) return text.trim();
  } catch {
    // ignore
  }

  return message;
}

function buildUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;

  // Proxy-style base: "/api" + "/properties" => "/api/properties"
  if (API_BASE_URL === '/api') return `${API_BASE_URL}${p}`;

  // Full URL base: must always include "/api"
  const apiPath = p.startsWith('/api/') ? p : `/api${p}`;
  return `${API_BASE_URL}${apiPath}`;
}

/**
 * Search for properties by name/code/area/governorate/postcode
 * GET /api/properties?search=<query>
 */
export async function searchProperties(query: string): Promise<Property[]> {
  const q = query.trim();
  if (!q) return [];

  const response = await fetch(buildUrl(`/properties?search=${encodeURIComponent(q)}`), {
    credentials: 'include',
  });

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
  if (!propertyCode) throw new Error('Property code is required for upload');

  const formData = new FormData();
  formData.append('file', file);
  formData.append('propertyCode', propertyCode);
  formData.append('propertyType', propertyType || '');
  formData.append('endowedTo', endowedTo || '');
  if (subfolder) formData.append('subfolder', subfolder);

  const response = await fetch(buildUrl('/upload'), {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    const message = await parseErrorMessage(response);
    throw new Error(`Upload failed: ${message}`);
  }

  return (await response.json()) as UploadResponse;
}

/**
 * Submit a complete property report
 * POST /api/reports
 */
export async function submitReport(report: PropertyReport): Promise<ReportSubmitResponse> {
  const response = await fetch(buildUrl('/reports'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(report),
    credentials: 'include',
  });

  if (!response.ok) {
    const message = await parseErrorMessage(response);
    throw new Error(`Report submission failed: ${message}`);
  }

  return (await response.json()) as ReportSubmitResponse;
}

/**
 * Generate exports (PDF + ZIP) on the backend and upload to Drive
 * POST /api/reports/:id/exports
 */
export async function generateReportExports(reportId: string): Promise<any> {
  if (!reportId) throw new Error('reportId is required');

  const response = await fetch(buildUrl(`/reports/${encodeURIComponent(reportId)}/exports`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
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

  const response = await fetch(buildUrl(`/reports/${encodeURIComponent(reportId)}/exports`), {
    credentials: 'include',
  });

  if (!response.ok) {
    const message = await parseErrorMessage(response);
    throw new Error(`Failed to fetch exports: ${message}`);
  }

  return await response.json();
}

/**
 * NEW: Generate a single ZIP bundle on the backend:
 * - Server-generated PDF
 * - Photos/files grouped by section
 * POST /api/bundle
 *
 * Notes:
 * - You send the report JSON + raw files (FormData).
 * - Backend responds with a ZIP blob.
 * - This function ONLY downloads (no navigation), so no white screen.
 */
export async function downloadBundleZip(
  report: PropertyReport,
  files: Array<{ field: string; file: File }>
): Promise<void> {
  const formData = new FormData();
  formData.append('report', JSON.stringify(report));

  for (const item of files) {
    // Backend uses multer.any(), so any field names are accepted.
    // Keep field names meaningful (e.g., "mainPhotos", "findingPhotos_1", "complaintFiles").
    formData.append(item.field, item.file, item.file.name);
  }

  const response = await fetch(buildUrl('/bundle'), {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    const message = await parseErrorMessage(response);
    throw new Error(`Bundle failed: ${message}`);
  }

  const blob = await response.blob();

  // Best-effort filename from header
  const cd = response.headers.get('content-disposition') || '';
  const match = cd.match(/filename\*=UTF-8''([^;]+)|filename="([^"]+)"/i);
  const filenameRaw = decodeURIComponent((match?.[1] || match?.[2] || 'bundle.zip').trim());
  const filename = filenameRaw && filenameRaw.toLowerCase().endsWith('.zip') ? filenameRaw : 'bundle.zip';

  // Download without changing page (prevents white screen)
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  // Revoke a bit later to avoid cutting off download in some browsers
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
