// Property from database (Google Sheet)
export interface Property {
  id: string;
  code: string;
  name: string;
  waqfType: string;        // نوع الوقف
  propertyType: string;    // نوع العقار
  endowedTo: string;       // موقوف على
  building: string;        // مبنى
  unitNumber: string;      // رقم الوحدة
  road: string;            // طريق \ شارع
  area: string;            // المنطقة
  governorate: string;     // المحافظة
  block: string;           // مجمع
  defaultLocationLink?: string;
}

// Photo with upload status
export interface UploadedPhoto {
  localId: string;
  file: File;
  uploadedUrl?: string;
  previewUrl?: string;
}

// Finding entry (text + photos)
export interface Finding {
  id: string;
  text: string;
  photos: UploadedPhoto[];
}

// Action entry (text only)
export interface Action {
  id: string;
  text: string;
}

// Complete report form data
export interface PropertyReport {
  // Property info
  propertyId: string;
  propertyCode: string;
  propertyName: string;

  // Editable property fields (from database)
  waqfType: string;        // نوع الوقف
  propertyType: string;    // نوع العقار
  endowedTo: string;       // موقوف على
  building: string;        // مبنى
  unitNumber: string;      // رقم الوحدة
  road: string;            // طريق \ شارع
  area: string;            // المنطقة
  governorate: string;     // المحافظة
  block: string;           // مجمع

  // Location
  locationDescription: string;
  locationLink: string;

  // Main photos
  mainPhotos: UploadedPhoto[];

  // Visit info
  visitType: string;
  complaint: string;

  // Findings & Actions
  findings: Finding[];
  actions: Action[];

  // Corrector (optional)
  corrector?: string;

  // Metadata
  submittedAt?: string;
  inspectorName?: string;
}

// API Response types
export interface PropertySearchResponse {
  properties: Property[];
  total: number;
}

export interface UploadResponse {
  url: string;
  filename: string;
}

export interface ReportSubmitResponse {
  success: boolean;
  reportId: string;
  message: string;
}
