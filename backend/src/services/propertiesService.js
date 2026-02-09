import { getSheetsClient } from '../config/google-hybrid.js';

/**
 * Properties Sheet Structure:
 * Column A: id
 * Column B: code
 * Column C: name
 * Column D: waqfType
 * Column E: propertyType
 * Column F: endowedTo
 * Column G: building
 * Column H: unitNumber
 * Column I: road
 * Column J: area
 * Column K: governorate
 * Column L: block
 * Column M: defaultLocationLink
 * Column N: postcode
 */

function s(v) {
  return (v ?? '').toString().trim();
}

/**
 * Get all properties from Google Sheet
 */
export async function getAllProperties() {
  const spreadsheetId = s(process.env.GOOGLE_SHEETS_PROPERTIES_ID);
  const sheetName = s(process.env.PROPERTIES_SHEET_NAME) || 'Properties';

  if (!spreadsheetId) {
    throw new Error('Missing GOOGLE_SHEETS_PROPERTIES_ID');
  }

  try {
    const sheets = await getSheetsClient();

    const range = `${sheetName}!A2:N`;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response?.data?.values || [];

    console.log(
      `[Sheets] Properties read: spreadsheetId=${spreadsheetId} sheet=${sheetName} range=${range} rows=${rows.length}`
    );

    // If your app worked locally but production shows empty, this helps you detect it immediately.
    // Remove this block later if you prefer silent empty behavior.
    if (rows.length === 0) {
      throw new Error(
        `No rows returned from Google Sheets. Check: (1) sheet shared with service account, (2) correct spreadsheetId, (3) correct tab name "${sheetName}", (4) data exists in A2:N`
      );
    }

    return rows.map((row) => ({
      id: s(row[0]),
      code: s(row[1]),
      name: s(row[2]),
      waqfType: s(row[3]),
      propertyType: s(row[4]),
      endowedTo: s(row[5]),
      building: s(row[6]),
      unitNumber: s(row[7]),
      road: s(row[8]),
      area: s(row[9]),
      governorate: s(row[10]),
      block: s(row[11]),
      defaultLocationLink: s(row[12]),
      postcode: s(row[13]),
    }));
  } catch (error) {
    console.error(
      'Error fetching properties from Google Sheet:',
      error?.message || error
    );
    throw new Error(`Failed to fetch properties from database: ${error?.message || error}`);
  }
}

/**
 * Search properties by query (name, code, area, governorate, or postcode)
 */
export async function searchProperties(query) {
  const q = s(query);
  if (!q) return [];

  const allProperties = await getAllProperties();
  const searchTerm = q.toLowerCase();

  const results = allProperties.filter((property) => {
    const name = (property.name || '').toLowerCase();
    const code = (property.code || '').toLowerCase();
    const area = (property.area || '').toLowerCase();
    const governorate = (property.governorate || '').toLowerCase();
    const postcode = (property.postcode || '').toLowerCase();

    return (
      name.includes(searchTerm) ||
      code.includes(searchTerm) ||
      area.includes(searchTerm) ||
      governorate.includes(searchTerm) ||
      postcode.includes(searchTerm)
    );
  });

  return results.slice(0, 20);
}

export async function getPropertyById(id) {
  const allProperties = await getAllProperties();
  const target = s(id);
  return allProperties.find((p) => p.id === target);
}

export async function getPropertyByCode(code) {
  const allProperties = await getAllProperties();
  const target = s(code);
  return allProperties.find((p) => p.code === target);
}

/**
 * Add a new property to the Google Sheet
 * All fields are optional except a generated id and code
 */
export async function addProperty(data) {
  const spreadsheetId = s(process.env.GOOGLE_SHEETS_PROPERTIES_ID);
  const sheetName = s(process.env.PROPERTIES_SHEET_NAME) || 'Properties';

  if (!spreadsheetId) {
    throw new Error('Missing GOOGLE_SHEETS_PROPERTIES_ID');
  }

  try {
    const sheets = await getSheetsClient();

    // Generate a unique id and code
    const allProperties = await getAllProperties();
    const maxId = allProperties.reduce((max, p) => {
      const num = parseInt(p.id, 10);
      return isNaN(num) ? max : Math.max(max, num);
    }, 0);
    const newId = String(maxId + 1);

    const maxCode = allProperties.reduce((max, p) => {
      const num = parseInt(p.code, 10);
      return isNaN(num) ? max : Math.max(max, num);
    }, 0);
    const newCode = String(maxCode + 1);

    // Build the row: A=id, B=code, C=name, D=waqfType, E=propertyType, F=endowedTo,
    // G=building, H=unitNumber, I=road, J=area, K=governorate, L=block, M=defaultLocationLink, N=postcode
    const newRow = [
      newId,
      newCode,
      s(data.name) || `عقار ${newCode}`,
      s(data.waqfType),
      s(data.propertyType),
      s(data.endowedTo),
      s(data.building),
      s(data.unitNumber),
      s(data.road),
      s(data.area),
      s(data.governorate),
      s(data.block),
      s(data.defaultLocationLink),
      s(data.postcode),
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:N`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [newRow],
      },
    });

    console.log(`[Sheets] New property added: id=${newId} code=${newCode}`);

    return {
      id: newId,
      code: newCode,
      name: newRow[2],
      waqfType: s(data.waqfType),
      propertyType: s(data.propertyType),
      endowedTo: s(data.endowedTo),
      building: s(data.building),
      unitNumber: s(data.unitNumber),
      road: s(data.road),
      area: s(data.area),
      governorate: s(data.governorate),
      block: s(data.block),
      defaultLocationLink: s(data.defaultLocationLink),
      postcode: s(data.postcode),
    };
  } catch (error) {
    console.error('Error adding property to Google Sheet:', error?.message || error);
    throw new Error(`Failed to add property to database: ${error?.message || error}`);
  }
}
