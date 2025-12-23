import { chromium } from 'playwright';

function safe(v) {
  return v === undefined || v === null ? '' : String(v);
}

function escapeHtml(s) {
  return safe(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderReportHtml(report) {
  const findings = Array.isArray(report?.findings) ? report.findings : [];
  const actions = Array.isArray(report?.actions) ? report.actions : [];

  const findingsHtml =
    findings.length === 0
      ? `<div class="muted">No findings</div>`
      : `<ol>${findings.map((f) => `<li>${escapeHtml(f?.text || '')}</li>`).join('')}</ol>`;

  const actionsHtml =
    actions.length === 0
      ? `<div class="muted">No actions</div>`
      : `<ol>${actions.map((a) => `<li>${escapeHtml(a?.text || '')}</li>`).join('')}</ol>`;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>VisitProp Report</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
    h1 { margin: 0 0 6px; font-size: 22px; }
    .sub { margin: 0 0 18px; color: #444; }
    .box { border: 1px solid #ddd; border-radius: 10px; padding: 14px; margin: 12px 0; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 14px; }
    .label { color: #555; font-size: 12px; }
    .value { font-size: 14px; }
    .muted { color: #777; }
    a { color: #1d4ed8; word-break: break-all; }
    @page { size: A4; margin: 18mm; }
  </style>
</head>
<body>
  <h1>${escapeHtml(report?.propertyCode || '')} - ${escapeHtml(report?.propertyName || '')}</h1>
  <p class="sub">Property Inspection Report</p>

  <div class="box">
    <div class="grid">
      <div>
        <div class="label">Waqf Type</div>
        <div class="value">${escapeHtml(report?.waqfType || '')}</div>
      </div>
      <div>
        <div class="label">Property Type</div>
        <div class="value">${escapeHtml(report?.propertyType || '')}</div>
      </div>
      <div>
        <div class="label">Endowed To</div>
        <div class="value">${escapeHtml(report?.endowedTo || '')}</div>
      </div>
      <div>
        <div class="label">Building / Unit</div>
        <div class="value">${escapeHtml(report?.building || '')} ${escapeHtml(report?.unitNumber || '')}</div>
      </div>
      <div>
        <div class="label">Area / Governorate</div>
        <div class="value">${escapeHtml(report?.area || '')} - ${escapeHtml(report?.governorate || '')}</div>
      </div>
      <div>
        <div class="label">Road / Block</div>
        <div class="value">${escapeHtml(report?.road || '')} - ${escapeHtml(report?.block || '')}</div>
      </div>
    </div>
  </div>

  <div class="box">
    <div class="label">Location Description</div>
    <div class="value">${escapeHtml(report?.locationDescription || '')}</div>
    <div style="height:10px"></div>
    <div class="label">Location Link</div>
    <div class="value">${
      report?.locationLink
        ? `<a href="${escapeHtml(report.locationLink)}">${escapeHtml(report.locationLink)}</a>`
        : `<span class="muted">N/A</span>`
    }</div>
  </div>

  <div class="box">
    <div class="label">Visit Type</div>
    <div class="value">${escapeHtml(report?.visitType || '')}</div>
    <div style="height:10px"></div>
    <div class="label">Complaint</div>
    <div class="value">${escapeHtml(report?.complaint || '')}</div>
  </div>

  <div class="box">
    <div class="label">Findings</div>
    <div class="value">${findingsHtml}</div>
  </div>

  <div class="box">
    <div class="label">Actions</div>
    <div class="value">${actionsHtml}</div>
  </div>

  <div class="box">
    <div class="label">Corrector</div>
    <div class="value">${escapeHtml(report?.corrector || '')}</div>
  </div>
</body>
</html>`;
}

export async function generatePdfBuffer(report) {
  const browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(renderReportHtml(report), { waitUntil: 'networkidle' });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
