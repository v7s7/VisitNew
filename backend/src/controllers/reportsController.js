import * as reportsService from '../services/reportsService.js';

/**
 * Submit a new report
 * POST /api/reports
 */
export async function submitReportHandler(req, res) {
  try {
    const report = req.body;

    // Validate required fields
    if (!report.propertyId || !report.propertyCode) {
      return res.status(400).json({
        success: false,
        message: 'Property information is required'
      });
    }

    if (!report.visitType || !report.complaint) {
      return res.status(400).json({
        success: false,
        message: 'Visit type and complaint are required'
      });
    }

    // Save report to Google Sheet
    const result = await reportsService.saveReport(report);

    res.json({
      success: true,
      reportId: result.reportId,
      message: 'Report submitted successfully'
    });
  } catch (error) {
    console.error('Submit report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit report',
      error: error.message
    });
  }
}

/**
 * Get all reports
 * GET /api/reports
 */
export async function getReportsHandler(req, res) {
  try {
    const { propertyCode } = req.query;

    let reports;
    if (propertyCode) {
      reports = await reportsService.getReportsByPropertyCode(propertyCode);
    } else {
      reports = await reportsService.getAllReports();
    }

    res.json({
      reports,
      total: reports.length
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({
      error: 'Failed to fetch reports',
      message: error.message
    });
  }
}

/**
 * Get a single report by ID
 * GET /api/reports/:id
 */
export async function getReportHandler(req, res) {
  try {
    const { id } = req.params;
    const report = await reportsService.getReportById(id);

    if (!report) {
      return res.status(404).json({
        error: 'Report not found'
      });
    }

    res.json(report);
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({
      error: 'Failed to fetch report',
      message: error.message
    });
  }
}
