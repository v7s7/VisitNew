import { getSheetsClient } from '../config/google-hybrid.js';

/**
 * Properties Sheet Structure:
 * Column A: id
 * Column B: code
 * Column C: name
 * Column D: نوع الوقف (waqfType)
 * Column E: نوع العقار (propertyType)
 * Column F: موقوف على (endowedTo)
 * Column G: مبنى (building)
 * Column H: رقم الوحدة (unitNumber)
 * Column I: طريق \ شارع (road)
 * Column J: المنطقة (area)
 * Column K: المحافظة (governorate)
 * Column L: مجمع (block)
 * Column M: defaultLocationLink
 */

/**
 * Get all properties from Google Sheet
 */
export async function getAllProperties() {
  try {
    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEETS_PROPERTIES_ID;
    const sheetName = process.env.PROPERTIES_SHEET_NAME || 'Properties';

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A2:M`, // Skip header row
    });

    const rows = response.data.values || [];

    const properties = rows.map(row => ({
      id: row[0] || '',
      code: row[1] || '',
      name: row[2] || '',
      waqfType: row[3] || '',         // نوع الوقف
      propertyType: row[4] || '',     // نوع العقار
      endowedTo: row[5] || '',        // موقوف على
      building: row[6] || '',         // مبنى
      unitNumber: row[7] || '',       // رقم الوحدة
      road: row[8] || '',             // طريق \ شارع
      area: row[9] || '',             // المنطقة
      governorate: row[10] || '',     // المحافظة
      block: row[11] || '',           // مجمع
      defaultLocationLink: row[12] || ''
    }));

    return properties;
  } catch (error) {
    console.error('Error fetching properties from Google Sheet:', error.message);
    throw new Error('Failed to fetch properties from database');
  }
}

/**
 * Search properties by query (name, code, or area)
 */
export async function searchProperties(query) {
  if (!query || !query.trim()) {
    return [];
  }

  const allProperties = await getAllProperties();
  const searchTerm = query.toLowerCase().trim();

  const results = allProperties.filter(property => {
    return (
      property.name.toLowerCase().includes(searchTerm) ||
      property.code.toLowerCase().includes(searchTerm) ||
      property.area.toLowerCase().includes(searchTerm) ||
      property.governorate.toLowerCase().includes(searchTerm)
    );
  });

  // Limit results to 20 for performance
  return results.slice(0, 20);
}

/**
 * Get a single property by ID
 */
export async function getPropertyById(id) {
  const allProperties = await getAllProperties();
  return allProperties.find(property => property.id === id);
}

/**
 * Get a single property by code
 */
export async function getPropertyByCode(code) {
  const allProperties = await getAllProperties();
  return allProperties.find(property => property.code === code);
}
