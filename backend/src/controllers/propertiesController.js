import * as propertiesService from '../services/propertiesService.js';

/**
 * Search properties
 * GET /api/properties?search=<query>
 */
export async function searchPropertiesHandler(req, res) {
  try {
    const searchQuery = String(req.query.search || '').trim();

    if (!searchQuery) {
      return res.json({
        properties: [],
        total: 0,
      });
    }

    const properties = await propertiesService.searchProperties(searchQuery);

    console.log(`🔍 Search: "${searchQuery}" - Found ${properties.length} properties`);

    return res.json({
      properties,
      total: properties.length,
    });
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({
      error: 'Failed to search properties',
      message: error?.message || 'Unknown error',
    });
  }
}

/**
 * Add a new property
 * POST /api/properties
 */
export async function addPropertyHandler(req, res) {
  try {
    const property = await propertiesService.addProperty(req.body || {});

    console.log(`➕ New property added: code=${property.code} name=${property.name}`);

    return res.status(201).json({
      success: true,
      property,
      message: 'Property added successfully',
    });
  } catch (error) {
    console.error('Add property error:', error);
    return res.status(500).json({
      error: 'Failed to add property',
      message: error?.message || 'Unknown error',
    });
  }
}

/**
 * Get property by ID
 * GET /api/properties/:id
 */
export async function getPropertyHandler(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: 'Missing property id',
      });
    }

    const property = await propertiesService.getPropertyById(id);

    if (!property) {
      return res.status(404).json({
        error: 'Property not found',
      });
    }

    return res.json(property);
  } catch (error) {
    console.error('Get property error:', error);
    return res.status(500).json({
      error: 'Failed to get property',
      message: error?.message || 'Unknown error',
    });
  }
}
