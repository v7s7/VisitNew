import { PropertyReport } from './types';
import { sanitizeFilename, generatePdfFilename } from './pdfUtils';
import { downloadBundleZip } from './api';

async function fetchBlob(url: string): Promise<Blob | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.blob();
  } catch {
    return null;
  }
}

function getFileExtensionFromNameOrMime(name: string, mime?: string): string {
  const lastDot = name.lastIndexOf('.');
  if (lastDot > 0) return name.substring(lastDot);
  if (mime && mime.startsWith('image/')) return `.${mime.split('/')[1]}`;
  return '';
}

function blobToFile(blob: Blob, fileName: string): File {
  const type = blob.type || 'application/octet-stream';
  return new File([blob], fileName, { type });
}

function pickBestName(obj: unknown, fallback: string): string {
  if (!obj || typeof obj !== 'object') return fallback;
  const o = obj as Record<string, any>;
  if (o.file instanceof File && o.file.name) return o.file.name;
  if (typeof o.name === 'string' && o.name.trim()) return o.name.trim();
  if (typeof o.originalName === 'string' && o.originalName.trim()) return o.originalName.trim();
  if (typeof o.filename === 'string' && o.filename.trim()) return o.filename.trim();
  return fallback;
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

async function inlineImages(root: HTMLElement): Promise<void> {
  const imgs = Array.from(root.querySelectorAll('img'));
  await Promise.all(
    imgs.map(async (img) => {
      const src = img.getAttribute('src') || '';
      if (!src || src.startsWith('data:')) return;
      try {
        const res = await fetch(src);
        if (!res.ok) return;
        const blob = await res.blob();
        const dataUrl = await blobToDataUrl(blob);
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
      for (const rule of Array.from(sheet.cssRules)) css += rule.cssText + '\n';
    } catch {
      // cross-origin stylesheet => ignore
    }
  }
  return css;
}

/**
 * Build HTML from the SAME DOM used for printing (#pdf-content),
 * with inlined images + injected CSS.
 * Backend will print this HTML to a REAL PDF (not image PDF).
 */
export async function buildPdfHtmlFromDom(pdfContentId: string = 'pdf-content'): Promise<string> {
  const el = document.getElementById(pdfContentId);
  if (!el) throw new Error(`PDF content not found (missing #${pdfContentId}).`);

  const clone = el.cloneNode(true) as HTMLElement;
  clone.classList.remove('pdf-content-hidden');
  clone.style.display = 'block';

  await inlineImages(clone);

  const cssText = collectCssText();
  const baseHref = window.location.origin + '/';

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <base href="${baseHref}">
  <style>${cssText}</style>
  <style>
    @page { size: A4; margin: 10mm; }
    html, body { background: #fff; margin: 0; padding: 0; }
  </style>
</head>
<body>
  ${clone.outerHTML}
</body>
</html>`;
}

export async function downloadReportZip(report: PropertyReport): Promise<void> {
  const filesPayload: Array<{ field: string; file: File }> = [];

  // Main photos
  (report.mainPhotos || []).forEach((p: any, i: number) => {
    if (p?.file instanceof File) {
      filesPayload.push({ field: 'mainPhotos', file: p.file });
    } else if (p?.uploadedUrl) {
      filesPayload.push({ field: 'mainPhotos', file: new File([], `Main Photo ${i + 1}`) });
    }
  });

  // Complaint files
  (report.complaintFiles || []).forEach((f: any, i: number) => {
    if (f?.file instanceof File) {
      filesPayload.push({ field: 'complaintFiles', file: f.file });
    } else if (f?.uploadedUrl) {
      const base = pickBestName(f, `Complaint File ${i + 1}`);
      filesPayload.push({ field: 'complaintFiles', file: new File([], sanitizeFilename(base)) });
    }
  });

  // Finding photos (0-based, double underscore)
  (report.findings || []).forEach((finding: any, idx: number) => {
    const field = `findingPhotos__${idx}`;
    (finding?.photos || []).forEach((p: any, j: number) => {
      if (p?.file instanceof File) {
        filesPayload.push({ field, file: p.file });
      } else if (p?.uploadedUrl) {
        filesPayload.push({ field, file: new File([], `Photo ${j + 1}`) });
      }
    });
  });

  // Replace placeholders by fetching blobs (best-effort)
  for (let i = 0; i < filesPayload.length; i++) {
    const item = filesPayload[i];
    const hasRealFile = item.file instanceof File && item.file.size > 0;
    if (hasRealFile) continue;

    if (item.field === 'mainPhotos') {
      const idx = filesPayload.slice(0, i + 1).filter((x) => x.field === 'mainPhotos').length - 1;
      const url = report.mainPhotos?.[idx]?.uploadedUrl;

      const base = pickBestName(report.mainPhotos?.[idx], `Main Photo ${idx + 1}`);
      const blob = url ? await fetchBlob(url) : null;
      if (blob) {
        const ext = getFileExtensionFromNameOrMime(base, blob.type);
        const fileName = sanitizeFilename(`${base}${ext && !base.endsWith(ext) ? ext : ''}`);
        filesPayload[i] = { field: item.field, file: blobToFile(blob, fileName) };
      }
      continue;
    }

    if (item.field === 'complaintFiles') {
      const idx = filesPayload.slice(0, i + 1).filter((x) => x.field === 'complaintFiles').length - 1;
      const url = report.complaintFiles?.[idx]?.uploadedUrl;

      const base = pickBestName(report.complaintFiles?.[idx], `Complaint File ${idx + 1}`);
      const blob = url ? await fetchBlob(url) : null;
      if (blob) {
        const ext = getFileExtensionFromNameOrMime(base, blob.type);
        const fileName = sanitizeFilename(`${base}${ext && !base.endsWith(ext) ? ext : ''}`);
        filesPayload[i] = { field: item.field, file: blobToFile(blob, fileName) };
      }
      continue;
    }

    if (item.field.startsWith('findingPhotos__')) {
      const findingIdx = Number(item.field.split('__')[1]);
      const photoIdx = filesPayload.filter((x) => x.field === item.field).indexOf(item);

      const url = report.findings?.[findingIdx]?.photos?.[photoIdx]?.uploadedUrl;

      const base = pickBestName(report.findings?.[findingIdx]?.photos?.[photoIdx], `Photo ${photoIdx + 1}`);
      const blob = url ? await fetchBlob(url) : null;
      if (blob) {
        const ext = getFileExtensionFromNameOrMime(base, blob.type);
        const fileName = sanitizeFilename(`${base}${ext && !base.endsWith(ext) ? ext : ''}`);
        filesPayload[i] = { field: item.field, file: blobToFile(blob, fileName) };
      }
      continue;
    }
  }

  const pdfHtml = await buildPdfHtmlFromDom('pdf-content');
  const pdfFileName = generatePdfFilename(report);

  await downloadBundleZip(report, filesPayload, { pdfHtml, pdfFileName });
}

export function validateReportForZip(report: PropertyReport | null): string | null {
  if (!report) return 'يرجى اختيار عقار أولاً | Please select a property first';

  const hasAnyFiles =
    (report.mainPhotos?.length || 0) > 0 ||
    (report.findings || []).some((f: any) => (f.photos?.length || 0) > 0) ||
    (report.complaintFiles?.length || 0) > 0;

  const hasAnyText =
    !!report.visitType?.trim() ||
    !!report.locationDescription?.trim() ||
    !!report.locationLink?.trim() ||
    !!report.additionalNotes?.trim() ||
    !!report.complaint?.trim() ||
    (report.findings || []).some((f: any) => (f.text || '').trim()) ||
    (report.actions || []).some((a: any) => (a.text || '').trim());

  if (!hasAnyFiles && !hasAnyText) return 'لا توجد بيانات أو ملفات للتحميل | No data or files to download';
  return null;
}
