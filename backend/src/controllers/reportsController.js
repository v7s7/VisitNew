import * as reportsService from '../services/reportsService.js';
import * as exportsService from '../services/exportsService.js';

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
        message: 'Property information is required',
      });
    }

    if (!report.visitType) {
      return res.status(400).json({
        success: false,
        message: 'Visit type is required',
      });
    }

    // Complaint is only required for complaint visits
    if (report.visitType === 'complaint' && !report.complaint) {
      return res.status(400).json({
        success: false,
        message: 'Complaint is required for complaint visits',
      });
    }

    const result = await reportsService.saveReport(report);

    res.json({
      success: true,
      reportId: result.reportId,
      message: 'Report submitted successfully',
      exportsEndpoint: `/api/reports/${result.reportId}/exports`,
    });
  } catch (error) {
    console.error('Submit report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit report',
      error: error.message,
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

    const reports = propertyCode
      ? await reportsService.getReportsByPropertyCode(propertyCode)
      : await reportsService.getAllReports();

    res.json({
      reports,
      total: reports.length,
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({
      error: 'Failed to fetch reports',
      message: error.message,
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
        error: 'Report not found',
      });
    }

    res.json(report);
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({
      error: 'Failed to fetch report',
      message: error.message,
    });
  }
}

/**
 * Generate exports (PDF + ZIP) and upload to Drive
 * POST /api/reports/:id/exports
 */
export async function generateExportsHandler(req, res) {
  try {
    const { id } = req.params;

    const report = await reportsService.getReportById(id);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    const exportsResult = await exportsService.generateAndUploadExports(report);

    res.json({
      success: true,
      reportId: id,
      exports: exportsResult,
      message: 'Exports generated successfully',
    });
  } catch (error) {
    console.error('Generate exports error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate exports',
      error: error.message,
    });
  }
}

/**
 * Get exports links/status
 * GET /api/reports/:id/exports
 */
export async function getExportsHandler(req, res) {
  try {
    const { id } = req.params;

    const report = await reportsService.getReportById(id);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    const exportsInfo = await exportsService.getExistingExports(report);

    res.json({
      success: true,
      reportId: id,
      exports: exportsInfo,
    });
  } catch (error) {
    console.error('Get exports error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch exports',
      error: error.message,
    });
  }
}
