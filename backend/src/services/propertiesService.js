import { getSheetsClient } from '../config/google.js';

/**
 * Properties Sheet Structure:
 * Column A: id
 * Column B: code
 * Column C: name
 * Column D: road
 * Column E: block
 * Column F: area
 * Column G: governorate
 * Column H: defaultLocationLink
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
      range: `${sheetName}!A2:H`, // Skip header row
    });

    const rows = response.data.values || [];

    const properties = rows.map(row => ({
      id: row[0] || '',
      code: row[1] || '',
      name: row[2] || '',
      road: row[3] || '',
      block: row[4] || '',
      area: row[5] || '',
      governorate: row[6] || '',
      defaultLocationLink: row[7] || ''
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
