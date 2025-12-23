import * as bundleService from '../services/bundleService.js';

export async function generateBundleHandler(req, res) {
  try {
    const reportJson = req.body?.report;

    if (!reportJson) {
      return res.status(400).json({
        success: false,
        message: 'Missing report field in form-data (report JSON required)',
      });
    }

    let report;
    try {
      report = JSON.parse(reportJson);
    } catch {
      return res.status(400).json({
        success: false,
        message: 'Invalid report JSON',
      });
    }

    const files = req.files || [];

    const { zipBuffer, zipFileName } = await bundleService.generateZipBundle({
      report,
      files,
      fields: req.body || {},
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);
    return res.status(200).send(zipBuffer);
  } catch (error) {
    console.error('Bundle generation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate bundle',
      error: error.message,
    });
  }
}
