// src/pdfUtils.ts
import { PropertyReport } from './types';

export function sanitizeFilename(filename: string): string {
  return (filename || '')
    .replace(/[/\\:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function getBahrainDateString(date: Date = new Date()): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Bahrain',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };

  const formatter = new Intl.DateTimeFormat('en-GB', options);
  const parts = formatter.formatToParts(date);

  const year = parts.find((p) => p.type === 'year')?.value || '0000';
  const month = parts.find((p) => p.type === 'month')?.value || '00';
  const day = parts.find((p) => p.type === 'day')?.value || '00';

  return `${year}-${month}-${day}`;
}

export function formatBahrainDate(date: Date = new Date()): string {
  return getBahrainDateString(date);
}

export function generatePdfFilename(report: PropertyReport): string {
  const dateStr = report.submittedAt
    ? getBahrainDateString(new Date(report.submittedAt))
    : getBahrainDateString();

  const code = sanitizeFilename(report.propertyCode || 'Report');
  const name = sanitizeFilename(report.propertyName || 'Property');

  return `${code} - ${name} - ${dateStr}.pdf`;
}

export function validateReportForPdf(report: PropertyReport | null): string | null {
  if (!report) return 'لا يوجد تقرير للطباعة | No report to print';

  const visitType = String(report.visitType || '').trim();
  if (!visitType) return 'يرجى تحديد نوع الزيارة | Please specify visit type';

  if (visitType === 'complaint') {
    const complaint = String(report.complaint || '').trim();
    if (!complaint) return 'يرجى كتابة تفاصيل البلاغ | Please enter complaint details';
  }

  return null;
}

async function inlineImages(root: HTMLElement): Promise<void> {
  const imgs = Array.from(root.querySelectorAll('img'));

  await Promise.all(
    imgs.map(async (img) => {
      const src = img.getAttribute('src') || '';
      if (!src || src.startsWith('data:')) return;

      try {
        const resp = await fetch(src, { mode: 'cors' });
        if (!resp.ok) return;

        const blob = await resp.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        });

        img.setAttribute('src', dataUrl);
      } catch {
        // ignore
      }
    })
  );
}

function collectCssText(): string {
  let css = '';
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const rules = sheet.cssRules;
      if (!rules) continue;
      for (const r of Array.from(rules)) css += `${r.cssText}\n`;
    } catch {
      // cross-origin stylesheet; ignore
    }
  }
  return css;
}

async function buildPrintHtmlFromDom(elementId: string, title: string): Promise<string> {
  const el = document.getElementById(elementId);
  if (!el) throw new Error(`Printable element #${elementId} not found`);

  const clone = el.cloneNode(true) as HTMLElement;

  // Remove hiding class if present (your DOM uses className="pdf-content-hidden")
  try {
    clone.classList.remove('pdf-content-hidden');
  } catch {}

  clone.removeAttribute('aria-hidden');

  // Force visible and normal flow (prevents white/blank + prevents clipping to viewport)
  clone.style.display = 'block';
  clone.style.visibility = 'visible';
  clone.style.position = 'static';
  clone.style.left = 'auto';
  clone.style.top = 'auto';
  clone.style.width = 'auto';
  clone.style.height = 'auto';
  clone.style.maxHeight = 'none';
  clone.style.overflow = 'visible';

  await inlineImages(clone);

  const css = collectCssText();

  // Aggressive print overrides to prevent:
  // - hidden/offscreen container styles
  // - fixed heights/overflow hidden causing "only first page printed"
  // - transforms/scale used for preview
  const hardPrintFixCss = `
    @page { size: A4; margin: 14mm; }

    html, body {
      margin: 0 !important;
      padding: 0 !important;
      height: auto !important;
      min-height: 0 !important;
      overflow: visible !important;
    }

    body {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      background: #fff !important;
    }

    /* Ensure the hidden container never hides in print window */
    .pdf-content-hidden {
      position: static !important;
      left: auto !important;
      top: auto !important;
      width: auto !important;
      height: auto !important;
      max-height: none !important;
      overflow: visible !important;
      visibility: visible !important;
      display: block !important;
    }

    /* Core: allow content to flow across pages */
    #${elementId} {
      position: static !important;
      width: auto !important;
      height: auto !important;
      max-height: none !important;
      overflow: visible !important;
      transform: none !important;
      zoom: 1 !important;
      contain: none !important;
    }

    #${elementId} * {
      overflow: visible !important;
      max-height: none !important;
      transform: none !important;
      contain: none !important;
    }

    /* Common “A4 preview page” classnames — if your PDF view uses fixed-height pages */
    .page, .a4, .a4-page, .pdf-page, .pdfPage, .print-page, [data-page] {
      height: auto !important;
      min-height: 0 !important;
      max-height: none !important;
      overflow: visible !important;
      box-shadow: none !important;
      margin: 0 !important;
    }

    /* Make sure images don’t overflow horizontally */
    img { max-width: 100% !important; height: auto !important; }

    /* Avoid accidental blank trailing page from forced breaks */
    #${elementId} { page-break-after: auto !important; break-after: auto !important; }
  `;

  const safeTitle = sanitizeFilename(title);

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${safeTitle}</title>
  <base href="${window.location.origin}/" />
  <style>${css}</style>
  <style>${hardPrintFixCss}</style>
</head>
<body>
  ${clone.outerHTML}
</body>
</html>`;
}

async function waitForWindowAssets(w: Window): Promise<void> {
  await new Promise<void>((resolve) => {
    if (w.document.readyState === 'complete') return resolve();
    w.addEventListener('load', () => resolve(), { once: true });
  });

  try {
    // @ts-ignore
    if (w.document.fonts?.ready) {
      // @ts-ignore
      await w.document.fonts.ready;
    }
  } catch {
    // ignore
  }

  const imgs = Array.from(w.document.images || []);
  await Promise.all(
    imgs.map(
      (img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              img.onload = () => resolve();
              img.onerror = () => resolve();
            })
    )
  );

  // Extra paint tick so layout is final before print
  await new Promise<void>((resolve) => w.requestAnimationFrame(() => w.requestAnimationFrame(() => resolve())));
}

export async function printReport(report: PropertyReport | null) {
  if (!report) return;

  const validation = validateReportForPdf(report);
  if (validation) throw new Error(validation);

  const title = sanitizeFilename(generatePdfFilename(report).replace(/\.pdf$/i, ''));
  const html = await buildPrintHtmlFromDom('pdf-content', title);

  const w = window.open('', '_blank', 'noopener,noreferrer,width=1000,height=700');
  if (!w) throw new Error('Popup blocked');

  w.document.open();
  w.document.write(html);
  w.document.close();

  await waitForWindowAssets(w);

  w.focus();

  // Close after printing (with fallback)
  const closeSafe = () => {
    try {
      w.close();
    } catch {}
  };

  w.addEventListener('afterprint', closeSafe, { once: true });

  w.print();

  // Fallback close (some browsers don’t fire afterprint reliably)
  setTimeout(closeSafe, 1500);
}
