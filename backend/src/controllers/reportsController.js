import * as reportsService from '../services/reportsService.js';
import * as exportsService from '../services/exportsService.js';

function safeMsg(err) {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  if (err.message) return err.message;
  return String(err);
}

function safeDetails(err) {
  // Prefer Google API error details when available
  return err?.response?.data || err?.errors || err?.stack || undefined;
}

/**
 * Submit a new report
 * POST /api/reports
 */
export async function submitReportHandler(req, res) {
  try {
    const report = req.body;

    if (!report?.propertyId || !report?.propertyCode) {
      return res.status(400).json({
        success: false,
        message: 'Property information is required',
      });
    }

    if (!report?.visitType) {
      return res.status(400).json({
        success: false,
        message: 'Visit type is required',
      });
    }

    if (report.visitType === 'complaint' && !report?.complaint) {
      return res.status(400).json({
        success: false,
        message: 'Complaint is required for complaint visits',
      });
    }

    const result = await reportsService.saveReport(report);

    return res.json({
      success: true,
      reportId: result?.reportId,
      message: 'Report submitted successfully',
      exportsEndpoint: result?.reportId ? `/api/reports/${result.reportId}/exports` : undefined,
    });
  } catch (error) {
    const msg = safeMsg(error);
    console.error('Submit report error (full):', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to submit report',
      error: msg,
      details: safeDetails(error),
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

    return res.json({
      reports,
      total: reports.length,
    });
  } catch (error) {
    const msg = safeMsg(error);
    console.error('Get reports error (full):', error);

    return res.status(500).json({
      error: 'Failed to fetch reports',
      message: msg,
      details: safeDetails(error),
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

    return res.json(report);
  } catch (error) {
    const msg = safeMsg(error);
    console.error('Get report error (full):', error);

    return res.status(500).json({
      error: 'Failed to fetch report',
      message: msg,
      details: safeDetails(error),
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

    return res.json({
      success: true,
      reportId: id,
      exports: exportsResult,
      message: 'Exports generated successfully',
    });
  } catch (error) {
    const msg = safeMsg(error);
    console.error('Generate exports error (full):', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to generate exports',
      error: msg,
      details: safeDetails(error),
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

    return res.json({
      success: true,
      reportId: id,
      exports: exportsInfo,
    });
  } catch (error) {
    const msg = safeMsg(error);
    console.error('Get exports error (full):', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch exports',
      error: msg,
      details: safeDetails(error),
    });
  }
}

/**
 * ✅ NEW: Instant ZIP (server-generated PDF + photos) returned directly
 * POST /api/exports
 *
 * Expects: report JSON in body (same shape as frontend buildCurrentReport()).
 * Returns: application/zip as attachment.
 */
export async function generateInstantZipHandler(req, res) {
  try {
    const report = req.body;

    if (!report?.propertyCode || !report?.propertyName) {
      return res.status(400).json({
        success: false,
        message: 'Property information is required',
      });
    }

    if (!report?.visitType) {
      return res.status(400).json({
        success: false,
        message: 'Visit type is required',
      });
    }

    if (report.visitType === 'complaint' && !report?.complaint) {
      return res.status(400).json({
        success: false,
        message: 'Complaint is required for complaint visits',
      });
    }

    const { zipBuffer, zipFileName } = await exportsService.generateInstantZipBuffer(report);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);
    res.setHeader('Content-Length', String(zipBuffer.length));

    return res.status(200).send(zipBuffer);
  } catch (error) {
    const msg = safeMsg(error);
    console.error('Instant ZIP export error (full):', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to generate ZIP',
      error: msg,
      details: safeDetails(error),
    });
  }
}
