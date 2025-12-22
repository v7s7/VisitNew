import archiver from 'archiver';
import { PassThrough } from 'stream';
import { format } from 'date-fns';
import { getDriveClient } from '../config/google-hybrid.js';

/**
 * Exports Service
 * - Generates:
 *   1) PDF report (print-ready HTML -> PDF using Playwright)
 *   2) ZIP evidence bundle (downloads Drive files, zips them with folders)
 * - Uploads both to Google Drive under:
 *   Main / <Property Folder> / <YYYY-MM-DD> / Exports /
 *
 * IMPORTANT:
 * - This file is self-contained and does NOT require driveService.js to export special helpers.
 * - It reuses your Drive folder rules:
 *   - Property folder: reused
 *   - Date folder: reused
 *   - Exports folder: reused
 */

function safeStr(v) {
  return v === undefined || v === null ? '' : String(v);
}

function sanitizeFolderName(name) {
  return safeStr(name).replace(/[/<>:"|?*\\]/g, '-').trim();
}

function sanitizeFileName(name) {
  return safeStr(name)
    .replace(/[/<>:"|?*\\]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function pickFirst(...vals) {
  for (const v of vals) {
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return '';
}

function getReportDate(report) {
  const fromSheet = pickFirst(report.submitDate, report.submit_date);
  if (fromSheet) return fromSheet;
  return format(new Date(), 'yyyy-MM-dd');
}

function normalizeReportForExports(report) {
  const mainPhotosUrls =
    report.mainPhotosUrls ||
    (report.mainPhotos || [])
      .map((p) => p?.uploadedUrl || p?.url)
      .filter(Boolean) ||
    [];

  const complaintFiles = Array.isArray(report.complaintFiles) ? report.complaintFiles : [];

  const complaintFileUrls = complaintFiles
    .map((f) => f?.url || f?.uploadedUrl)
    .filter(Boolean);

  const findingsRaw = Array.isArray(report.findings) ? report.findings : [];
  const findings = findingsRaw.map((f, idx) => {
    const text = pickFirst(f?.text, f?.description, f?.title);
    const photos =
      (f?.photos || [])
        .map((p) => (typeof p === 'string' ? p : p?.uploadedUrl || p?.url))
        .filter(Boolean) || [];
    return { index: idx + 1, text, photos };
  });

  return {
    reportId: pickFirst(report.reportId, report.id),
    submitDate: getReportDate(report),
    propertyCode: pickFirst(report.propertyCode, report.propertyCodeValue),
    propertyName: pickFirst(report.propertyName, report.name),
    propertyType: pickFirst(report.propertyType),
    endowedTo: pickFirst(report.endowedTo),
    waqfType: pickFirst(report.waqfType),
    building: pickFirst(report.building),
    unitNumber: pickFirst(report.unitNumber),
    road: pickFirst(report.road),
    area: pickFirst(report.area),
    governorate: pickFirst(report.governorate),
    block: pickFirst(report.block),
    locationDescription: pickFirst(report.locationDescription),
    locationLink: pickFirst(report.locationLink),
    visitType: pickFirst(report.visitType),
    complaint: pickFirst(report.complaint),
    corrector: pickFirst(report.corrector),
    inspectorName: pickFirst(report.inspectorName),
    floorsCount: report.floorsCount,
    flatsCount: report.flatsCount,
    additionalNotes: pickFirst(report.additionalNotes),
    actions: Array.isArray(report.actions) ? report.actions : [],
    mainPhotosUrls,
    complaintFiles,
    complaintFileUrls,
    findings,
  };
}

function extractDriveFileId(url) {
  const u = safeStr(url);

  const m1 = u.match(/\/file\/d\/([^/]+)/);
  if (m1) return m1[1];

  const m2 = u.match(/[?&]id=([^&]+)/);
  if (m2) return m2[1];

  const m3 = u.match(/\/d\/([^/]+)/);
  if (m3) return m3[1];

  return null;
}

async function downloadDriveFileToBuffer(fileId) {
  const drive = await getDriveClient();
  const resp = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'arraybuffer' });
  return Buffer.from(resp.data);
}

async function resolveNameFromDrive(fileId) {
  const drive = await getDriveClient();
  const resp = await drive.files.get({ fileId, fields: 'name,mimeType' });
  return {
    name: resp.data?.name || `file-${fileId}`,
    mimeType: resp.data?.mimeType || 'application/octet-stream',
  };
}

function htmlEscape(s) {
  return safeStr(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildReportHtml(r) {
  const actionsText = Array.isArray(r.actions)
    ? r.actions
        .map((a) => (typeof a === 'string' ? a : a?.text))
        .filter(Boolean)
    : [];

  const findings = r.findings || [];

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${htmlEscape(r.propertyCode)} - ${htmlEscape(r.submitDate)}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111; }
    h1 { font-size: 18px; margin: 0 0 10px; }
    h2 { font-size: 14px; margin: 16px 0 8px; }
    .muted { color: #555; font-size: 12px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 14px; }
    .row { border-bottom: 1px solid #eee; padding: 6px 0; }
    .label { font-weight: 700; font-size: 12px; }
    .value { font-size: 12px; white-space: pre-wrap; }
    ul { margin: 6px 0 0 18px; }
    li { font-size: 12px; margin: 4px 0; }
    .box { border: 1px solid #e5e5e5; border-radius: 10px; padding: 10px; }
    a { color: #0b57d0; text-decoration: none; }
    .small { font-size: 11px; }
  </style>
</head>
<body>
  <h1>Property Inspection Report</h1>
  <div class="muted">
    Report ID: ${htmlEscape(r.reportId || '')} &nbsp;|&nbsp;
    Date: ${htmlEscape(r.submitDate)} &nbsp;|&nbsp;
    Property: ${htmlEscape(r.propertyCode)} - ${htmlEscape(r.propertyName)}
  </div>

  <h2>Property Details</h2>
  <div class="box">
    <div class="grid">
      <div class="row"><div class="label">Waqf Type</div><div class="value">${htmlEscape(r.waqfType)}</div></div>
      <div class="row"><div class="label">Property Type</div><div class="value">${htmlEscape(r.propertyType)}</div></div>

      <div class="row"><div class="label">Endowed To</div><div class="value">${htmlEscape(r.endowedTo)}</div></div>
      <div class="row"><div class="label">Building</div><div class="value">${htmlEscape(r.building)}</div></div>

      <div class="row"><div class="label">Unit Number</div><div class="value">${htmlEscape(r.unitNumber)}</div></div>
      <div class="row"><div class="label">Road</div><div class="value">${htmlEscape(r.road)}</div></div>

      <div class="row"><div class="label">Area</div><div class="value">${htmlEscape(r.area)}</div></div>
      <div class="row"><div class="label">Governorate</div><div class="value">${htmlEscape(r.governorate)}</div></div>

      <div class="row"><div class="label">Block</div><div class="value">${htmlEscape(r.block)}</div></div>
      <div class="row"><div class="label">Floors / Flats</div><div class="value">${htmlEscape(r.floorsCount ?? '')} / ${htmlEscape(r.flatsCount ?? '')}</div></div>
    </div>

    <div class="row">
      <div class="label">Location Description</div>
      <div class="value">${htmlEscape(r.locationDescription)}</div>
    </div>

    ${
      r.locationLink
        ? `<div class="row">
            <div class="label">Location Link</div>
            <div class="value"><a href="${htmlEscape(r.locationLink)}">${htmlEscape(r.locationLink)}</a></div>
          </div>`
        : ''
    }
  </div>

  <h2>Visit</h2>
  <div class="box">
    <div class="row"><div class="label">Visit Type</div><div class="value">${htmlEscape(r.visitType)}</div></div>
    ${
      r.complaint
        ? `<div class="row"><div class="label">Complaint</div><div class="value">${htmlEscape(r.complaint)}</div></div>`
        : ''
    }
  </div>

  <h2>Findings</h2>
  <div class="box">
    ${
      findings.length
        ? `<ul>
            ${findings
              .map(
                (f) =>
                  `<li><b>Finding ${f.index}:</b> ${htmlEscape(f.text)} <span class="muted small">(photos: ${
                    (f.photos || []).length
                  })</span></li>`
              )
              .join('')}
          </ul>`
        : `<div class="muted">No findings</div>`
    }
  </div>

  <h2>Actions</h2>
  <div class="box">
    ${
      actionsText.length
        ? `<ul>${actionsText.map((t) => `<li>${htmlEscape(t)}</li>`).join('')}</ul>`
        : `<div class="muted">No actions</div>`
    }
  </div>

  ${
    r.additionalNotes
      ? `<h2>Additional Notes</h2>
         <div class="box"><div class="value">${htmlEscape(r.additionalNotes)}</div></div>`
      : ''
  }

  <h2>Meta</h2>
  <div class="box">
    <div class="grid">
      <div class="row"><div class="label">Inspector</div><div class="value">${htmlEscape(r.inspectorName)}</div></div>
      <div class="row"><div class="label">Corrector</div><div class="value">${htmlEscape(r.corrector)}</div></div>
    </div>
  </div>

  <div class="muted small" style="margin-top: 10px;">
    Evidence files are packaged separately in the ZIP export.
  </div>
</body>
</html>`;
}

async function generatePdfBuffer(report) {
  // Lazy import so server can still boot if Playwright isn't installed yet.
  const { chromium } = await import('playwright');

  const r = normalizeReportForExports(report);
  const html = buildReportHtml(r);

  const browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '14mm', bottom: '14mm', left: '14mm', right: '14mm' },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

async function zipToBuffer(addFilesFn) {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const stream = new PassThrough();
    const chunks = [];

    stream.on('data', (c) => chunks.push(c));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);

    archive.on('warning', (err) => {
      console.warn('ZIP warning:', err?.message || err);
    });
    archive.on('error', reject);

    archive.pipe(stream);

    Promise.resolve()
      .then(() => addFilesFn(archive))
      .then(() => archive.finalize())
      .catch(reject);
  });
}

async function generateZipBuffer(report) {
  const r = normalizeReportForExports(report);

  const addUrlAsFile = async (archive, url, pathInZip, fallbackName) => {
    const fileId = extractDriveFileId(url);
    if (!fileId) return;

    const meta = await resolveNameFromDrive(fileId);
    const name = sanitizeFileName(meta.name || fallbackName || `file-${fileId}`);

    const buf = await downloadDriveFileToBuffer(fileId);
    archive.append(buf, { name: `${pathInZip}/${name}` });
  };

  const zipBuffer = await zipToBuffer(async (archive) => {
    // Main Photos
    if (r.mainPhotosUrls?.length) {
      for (let i = 0; i < r.mainPhotosUrls.length; i++) {
        await addUrlAsFile(archive, r.mainPhotosUrls[i], 'Main Photos', `main-${i + 1}`);
      }
    }

    // Complaint Files
    if (r.complaintFiles?.length) {
      for (let i = 0; i < r.complaintFiles.length; i++) {
        const f = r.complaintFiles[i];
        const url = f?.url || f?.uploadedUrl;
        if (!url) continue;

        const preferredName = f?.name || `complaint-${i + 1}`;
        await addUrlAsFile(archive, url, 'Complaint Files', preferredName);
      }
    } else if (r.complaintFileUrls?.length) {
      for (let i = 0; i < r.complaintFileUrls.length; i++) {
        await addUrlAsFile(archive, r.complaintFileUrls[i], 'Complaint Files', `complaint-${i + 1}`);
      }
    }

    // Findings photos
    if (r.findings?.length) {
      for (const f of r.findings) {
        const folderName =
          sanitizeFileName(`Finding ${f.index} - ${f.text || ''}`) || `Finding ${f.index}`;
        const photos = f.photos || [];
        for (let i = 0; i < photos.length; i++) {
          await addUrlAsFile(
            archive,
            photos[i],
            `Findings/${folderName}`,
            `finding-${f.index}-${i + 1}`
          );
        }
      }
    }

    const readme = [
      `VisitProp Evidence Bundle`,
      ``,
      `Report ID: ${safeStr(r.reportId)}`,
      `Date: ${safeStr(r.submitDate)}`,
      `Property: ${safeStr(r.propertyCode)} - ${safeStr(r.propertyName)}`,
      ``,
      `Folders:`,
      `- Main Photos`,
      `- Complaint Files`,
      `- Findings/<Finding N - ...>`,
      ``,
      `Generated by backend exports service.`,
      ``,
    ].join('\n');

    archive.append(readme, { name: 'README.txt' });
  });

  return zipBuffer;
}

function buildExportNames(report) {
  const r = normalizeReportForExports(report);
  const date = getReportDate(r);
  const base =
    sanitizeFileName(`${r.propertyCode} - ${r.propertyName} - ${date}`) ||
    sanitizeFileName(`${r.propertyCode} - ${date}`) ||
    sanitizeFileName(`Export - ${date}`);

  const pdfName = `${base} - Report.pdf`;
  const zipName = `${base} - Evidence.zip`;
  return { base, pdfName, zipName };
}

async function getOrCreateFolder(parentFolderId, folderName) {
  const drive = await getDriveClient();

  const escaped = folderName.replace(/'/g, "\\'");
  const query = `name='${escaped}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;

  const search = await drive.files.list({
    q: query,
    fields: 'files(id,name,webViewLink)',
    spaces: 'drive',
  });

  const existing = search.data.files?.[0];
  if (existing?.id) return { id: existing.id, webViewLink: existing.webViewLink || null };

  const created = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    },
    fields: 'id,name,webViewLink',
  });

  return { id: created.data.id, webViewLink: created.data.webViewLink || null };
}

async function ensureExportsFolder(propertyCode, propertyType, endowedTo, dateStr) {
  const mainFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!mainFolderId) throw new Error('Missing GOOGLE_DRIVE_FOLDER_ID');

  const today = dateStr || format(new Date(), 'yyyy-MM-dd');

  const propertyFolderName = sanitizeFolderName(`${propertyCode}, ${propertyType}, ${endowedTo}`);
  const propertyFolder = await getOrCreateFolder(mainFolderId, propertyFolderName);

  const dateFolder = await getOrCreateFolder(propertyFolder.id, today);

  const exportsFolder = await getOrCreateFolder(dateFolder.id, 'Exports');

  return {
    today,
    propertyFolderId: propertyFolder.id,
    dateFolderId: dateFolder.id,
    exportsFolderId: exportsFolder.id,
    propertyFolderUrl: propertyFolder.webViewLink,
    dateFolderUrl: dateFolder.webViewLink,
    exportsFolderUrl: exportsFolder.webViewLink,
  };
}

async function uploadBufferToDrive(buffer, fileName, mimeType, parentFolderId) {
  const drive = await getDriveClient();

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [parentFolderId],
    },
    media: {
      mimeType,
      body: Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer),
    },
    fields: 'id,name,webViewLink,webContentLink',
  });

  return {
    fileId: response.data.id,
    fileName: response.data.name || fileName,
    url: response.data.webViewLink || `https://drive.google.com/file/d/${response.data.id}/view`,
    downloadUrl: response.data.webContentLink || null,
  };
}

/**
 * Generate PDF + ZIP and upload both to Drive under Exports folder.
 * Returns URLs for phone users to open/share and later download on PC.
 */
export async function generateAndUploadExports(report) {
  const r = normalizeReportForExports(report);

  if (!r.propertyCode || !r.propertyType || !r.endowedTo) {
    throw new Error('Missing propertyCode/propertyType/endowedTo required to build Drive export folder.');
  }

  const { pdfName, zipName } = buildExportNames(r);

  const folders = await ensureExportsFolder(r.propertyCode, r.propertyType, r.endowedTo, getReportDate(r));

  const [pdfBuffer, zipBuffer] = await Promise.all([generatePdfBuffer(r), generateZipBuffer(r)]);

  const pdfUpload = await uploadBufferToDrive(pdfBuffer, pdfName, 'application/pdf', folders.exportsFolderId);
  const zipUpload = await uploadBufferToDrive(zipBuffer, zipName, 'application/zip', folders.exportsFolderId);

  return {
    folderUrl: folders.exportsFolderUrl || folders.dateFolderUrl || null,
    exportsFolderUrl: folders.exportsFolderUrl || null,
    dateFolderUrl: folders.dateFolderUrl || null,
    generatedAt: new Date().toISOString(),
    dateFolder: folders.today,
    pdf: pdfUpload,
    zip: zipUpload,
  };
}

/**
 * Try to find existing exports in Drive (best-effort).
 */
export async function getExistingExports(report) {
  const r = normalizeReportForExports(report);

  if (!r.propertyCode || !r.propertyType || !r.endowedTo) {
    return { exists: false, message: 'Missing propertyCode/propertyType/endowedTo.' };
  }

  const folders = await ensureExportsFolder(r.propertyCode, r.propertyType, r.endowedTo, getReportDate(r));

  const drive = await getDriveClient();
  const query = `'${folders.exportsFolderId}' in parents and trashed=false`;

  const resp = await drive.files.list({
    q: query,
    fields: 'files(id,name,webViewLink,webContentLink,mimeType,createdTime)',
    spaces: 'drive',
  });

  const files = resp.data.files || [];

  const pdf = files.find((f) => safeStr(f.name).toLowerCase().endsWith('.pdf'));
  const zip = files.find((f) => safeStr(f.name).toLowerCase().endsWith('.zip'));

  return {
    exists: Boolean(pdf || zip),
    exportsFolderUrl: folders.exportsFolderUrl || null,
    dateFolderUrl: folders.dateFolderUrl || null,
    pdf: pdf
      ? {
          fileId: pdf.id,
          fileName: pdf.name,
          url: pdf.webViewLink || `https://drive.google.com/file/d/${pdf.id}/view`,
          downloadUrl: pdf.webContentLink || null,
          createdTime: pdf.createdTime || null,
        }
      : null,
    zip: zip
      ? {
          fileId: zip.id,
          fileName: zip.name,
          url: zip.webViewLink || `https://drive.google.com/file/d/${zip.id}/view`,
          downloadUrl: zip.webContentLink || null,
          createdTime: zip.createdTime || null,
        }
      : null,
  };
}
