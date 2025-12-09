import {
  Property,
  PropertySearchResponse,
  PropertyReport,
  ReportSubmitResponse,
  UploadResponse,
} from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Search for properties by name or code
 * GET /api/properties?search=<query>
 */
export async function searchProperties(query: string): Promise<Property[]> {
  if (!query.trim()) {
    return [];
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/properties?search=${encodeURIComponent(query)}`
    );

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    const data: PropertySearchResponse = await response.json();
    return data.properties;
  } catch (error) {
    console.error('Property search error:', error);
    throw error;
  }
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
  try {
    // Validate required parameters
    if (!propertyCode) {
      throw new Error('Property code is required for upload');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('propertyCode', propertyCode);
    formData.append('propertyType', propertyType || '');
    formData.append('endowedTo', endowedTo || '');
    if (subfolder) {
      formData.append('subfolder', subfolder);
    }

    console.log('📤 Uploading file:', {
      fileName: file.name,
      propertyCode,
      propertyType,
      endowedTo,
      subfolder,
    });

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Upload failed: ${errorData.message || response.statusText}`);
    }

    const data: UploadResponse = await response.json();
    return data;
  } catch (error) {
    console.error('File upload error:', error);
    throw error;
  }
}

/**
 * Submit a complete property report
 * POST /api/reports
 */
export async function submitReport(report: PropertyReport): Promise<ReportSubmitResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(report),
    });

    if (!response.ok) {
      throw new Error(`Report submission failed: ${response.statusText}`);
    }

    const data: ReportSubmitResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Report submission error:', error);
    throw error;
  }
}
