// src/pdfUtils.ts
import { PropertyReport } from './types';

function sanitizeFilename(filename: string): string {
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

export function validateReportForPdf(report: PropertyReport): string | null {
  if (!report?.propertyCode?.trim() || !report?.propertyName?.trim()) {
    return 'يرجى اختيار العقار | Please select a property';
  }
  if (!report?.visitType?.trim()) {
    return 'يرجى تحديد نوع الزيارة | Please specify visit type';
  }
  if (report.visitType === 'complaint' && !report?.complaint?.trim()) {
    return 'يرجى كتابة تفاصيل البلاغ | Please enter complaint details';
  }
  return null;
}

async function inlineImages(root: HTMLElement): Promise<void> {
  const imgs = Array.from(root.querySelectorAll('img'));
  await Promise.all(
    imgs.map(async (img) => {
      const src = img.getAttribute('src') || '';
      if (!src || src.startsWith('data:') || src.startsWith('blob:')) return;

      try {
        const resp = await fetch(src, { credentials: 'include' });
        if (!resp.ok) return;
        const blob = await resp.blob();

        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error('Failed to read image'));
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

  // 🔧 Critical: remove the hidden/offscreen class so it prints (fixes blank white page)
  clone.classList.remove('pdf-content-hidden');
  clone.removeAttribute('aria-hidden');

  // Force visible in the print window
  clone.style.display = 'block';
  clone.style.visibility = 'visible';
  clone.style.position = 'static';
  clone.style.left = 'auto';
  clone.style.top = 'auto';
  clone.style.transform = 'none';
  clone.style.height = 'auto';
  clone.style.maxHeight = 'none';
  clone.style.overflow = 'visible';

  await inlineImages(clone);

  const css = collectCssText();

  const hardPrintFixCss = `
    @page { size: A4; margin: 14mm; }
    html, body { margin: 0 !important; padding: 0 !important; height: auto !important; min-height: 0 !important; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff !important; }

    /* Force-show the PDF container (fixes "prints blank" when it was hidden/offscreen) */
    #${elementId},
    .pdf-content-hidden {
      display: block !important;
      visibility: visible !important;
      position: static !important;
      left: auto !important;
      top: auto !important;
      transform: none !important;
      height: auto !important;
      min-height: 0 !important;
      max-height: none !important;
      overflow: visible !important;
    }

    /* Reduce common causes of extra blank page */
    * { box-shadow: none !important; }
    img { max-width: 100% !important; height: auto !important; }
    body > *:last-child { page-break-after: auto !important; break-after: auto !important; }
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
  <script>
    // Close after printing (fallback if afterprint doesn't fire)
    window.addEventListener('afterprint', () => { try { window.close(); } catch (e) {} }, { once: true });
    setTimeout(() => { try { window.close(); } catch (e) {} }, 2000);
  </script>
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
    imgs.map((img) =>
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

  const title = sanitizeFilename(generatePdfFilename(report).replace(/\.pdf$/i, ''));
  const html = await buildPrintHtmlFromDom('pdf-content', title);

  const w = window.open('', '_blank', 'width=900,height=650');
  if (!w) throw new Error('Popup blocked');

  w.document.open();
  w.document.write(html);
  w.document.close();

  await waitForWindowAssets(w);

  w.focus();
  w.print();
}
