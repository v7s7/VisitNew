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
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Bahrain',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };
  return new Intl.DateTimeFormat('en-GB', options).format(date);
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

  // Only validate DOM existence (you already validate fields in the form)
  const root = document.getElementById('pdf-content');
  if (!root) return 'عنصر الطباعة غير موجود | Printable element not found (#pdf-content)';

  const inner = root.querySelector('.pdf-report');
  if (!inner) return 'محتوى التقرير غير موجود | Report content not found (.pdf-report)';

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
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        img.setAttribute('src', dataUrl);
      } catch {
        // ignore (CORS / network)
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
  const host = document.getElementById(elementId);
  if (!host) throw new Error(`Printable element #${elementId} not found`);

  // ✅ Print the actual report node, not the hidden wrapper
  const printableNode = (host.querySelector('.pdf-report') as HTMLElement) || host;
  const clone = printableNode.cloneNode(true) as HTMLElement;

  clone.style.display = 'block';
  clone.style.visibility = 'visible';
  clone.style.position = 'static';

  await inlineImages(clone);

  const css = collectCssText();

  // ✅ Print-only overrides (do NOT touch your original CSS file)
  const hardPrintFixCss = `
    @page { size: A4 portrait; margin: 15mm 12mm; }

    @media print {
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
        display: block !important;
      }

      /* Neutralize "hidden/offscreen" wrappers that clip printing */
      #${elementId},
      .pdf-content-hidden {
        position: static !important;
        left: auto !important;
        top: auto !important;
        width: auto !important;
        height: auto !important;
        max-height: none !important;
        overflow: visible !important;
        clip: auto !important;
        clip-path: none !important;
        opacity: 1 !important;
        visibility: visible !important;
        display: block !important;
        transform: none !important;
      }

      /* ✅ Allow multi-page pagination */
      .pdf-report {
        width: auto !important;
        max-width: none !important;
        min-height: auto !important;
        height: auto !important;
        overflow: visible !important;
        margin: 0 !important;
      }

      /* ✅ This is the main cause of "only 1 page" in many cases */
      .pdf-section {
        page-break-inside: auto !important;
        break-inside: auto !important;
      }

      /* Keep small blocks together */
      .pdf-photo-item,
      .pdf-finding {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }

      img {
        max-width: 100% !important;
        height: auto !important;
      }
    }
  `;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title}</title>
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
}

export async function printReport(report: PropertyReport | null) {
  if (!report) return;

  const domError = validateReportForPdf(report);
  if (domError) throw new Error(domError);

  const title = sanitizeFilename(generatePdfFilename(report).replace(/\.pdf$/i, ''));
  const html = await buildPrintHtmlFromDom('pdf-content', title);

  const w = window.open('', '_blank', 'noopener,noreferrer,width=900,height=650');
  if (!w) throw new Error('Popup blocked');

  w.document.open();
  w.document.write(html);
  w.document.close();

  await waitForWindowAssets(w);

  // small delay helps Chrome paginate before print
  await new Promise((r) => setTimeout(r, 80));

  w.focus();
  w.print();

  setTimeout(() => {
    try {
      w.close();
    } catch {}
  }, 600);
}
