import { PropertyReport } from './types';
import { sanitizeFilename, getBahrainDateString, generatePdfFilename } from './pdfUtils';
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

  // Prefer real File name if available
  if (o.file instanceof File && o.file.name) return o.file.name;

  // Some models may store a plain name/originalName/filename
  if (typeof o.name === 'string' && o.name.trim()) return o.name.trim();
  if (typeof o.originalName === 'string' && o.originalName.trim()) return o.originalName.trim();
  if (typeof o.filename === 'string' && o.filename.trim()) return o.filename.trim();

  return fallback;
}

/**
 * Generate a PDF blob from the hidden PDF DOM (#pdf-content)
 * Uses dynamic imports to avoid bloating initial bundle.
 */
export async function generatePdfBlobFromDom(pdfContentId: string = 'pdf-content'): Promise<Blob> {
  const el = document.getElementById(pdfContentId);
  if (!el) throw new Error(`PDF content not found (missing #${pdfContentId}).`);

  const prevClass = el.className;
  el.className = prevClass.replace('pdf-content-hidden', '').trim();

  try {
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);

    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: el.scrollWidth,
      windowHeight: el.scrollHeight,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgProps = pdf.getImageProperties(imgData);
    const imgWidth = pageWidth;
    const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

    let y = 0;
    let remaining = imgHeight;

    while (remaining > 0) {
      pdf.addImage(imgData, 'PNG', 0, y, imgWidth, imgHeight);
      remaining -= pageHeight;

      if (remaining > 0) {
        pdf.addPage();
        y -= pageHeight;
      }
    }

    return pdf.output('blob');
  } finally {
    el.className = prevClass;
  }
}

/**
 * Download ZIP via backend (/api/bundle) and include the same client-rendered PDF used for Print.
 */
export async function downloadReportZip(report: PropertyReport): Promise<void> {
  const filesPayload: Array<{ field: string; file: File }> = [];

  // Main photos
  (report.mainPhotos || []).forEach((p: any, i: number) => {
    if (p?.file instanceof File) {
      filesPayload.push({ field: 'mainPhotos', file: p.file });
    } else if (p?.uploadedUrl) {
      filesPayload.push({
        field: 'mainPhotos',
        file: new File([], `Main Photo ${i + 1}`), // placeholder
      });
    }
  });

  // Complaint files
  (report.complaintFiles || []).forEach((f: any, i: number) => {
    if (f?.file instanceof File) {
      filesPayload.push({ field: 'complaintFiles', file: f.file });
    } else if (f?.uploadedUrl) {
      const base = pickBestName(f, `Complaint File ${i + 1}`);
      filesPayload.push({
        field: 'complaintFiles',
        file: new File([], sanitizeFilename(base)), // placeholder
      });
    }
  });

  // Finding photos (0-based, double underscore)
  (report.findings || []).forEach((finding: any, idx: number) => {
    const field = `findingPhotos__${idx}`;
    (finding?.photos || []).forEach((p: any, j: number) => {
      if (p?.file instanceof File) {
        filesPayload.push({ field, file: p.file });
      } else if (p?.uploadedUrl) {
        filesPayload.push({
          field,
          file: new File([], `Photo ${j + 1}`), // placeholder
        });
      }
    });
  });

  // Replace placeholders by fetching blobs (best-effort)
  for (let i = 0; i < filesPayload.length; i++) {
    const item = filesPayload[i];
    const hasRealFile = item.file instanceof File && item.file.size > 0;
    if (hasRealFile) continue;

    let url: string | undefined;

    if (item.field === 'mainPhotos') {
      const idx = filesPayload.slice(0, i + 1).filter((x) => x.field === 'mainPhotos').length - 1;
      url = report.mainPhotos?.[idx]?.uploadedUrl;

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
      url = report.complaintFiles?.[idx]?.uploadedUrl;

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
      const idx = Number(item.field.split('__')[1]);
      const photoIdx = filesPayload.filter((x) => x.field === item.field).indexOf(item);

      url = report.findings?.[idx]?.photos?.[photoIdx]?.uploadedUrl;

      const base = pickBestName(report.findings?.[idx]?.photos?.[photoIdx], `Photo ${photoIdx + 1}`);
      const blob = url ? await fetchBlob(url) : null;
      if (blob) {
        const ext = getFileExtensionFromNameOrMime(base, blob.type);
        const fileName = sanitizeFilename(`${base}${ext && !base.endsWith(ext) ? ext : ''}`);
        filesPayload[i] = { field: item.field, file: blobToFile(blob, fileName) };
      }
      continue;
    }
  }

  // Attach client PDF (same as print DOM) into the backend ZIP
  let reportPdf: Blob | undefined;
  try {
    reportPdf = await generatePdfBlobFromDom('pdf-content');
  } catch {
    reportPdf = undefined;
  }

  const reportPdfFileName = generatePdfFilename({
    ...report,
    submittedAt: report.submittedAt || `${getBahrainDateString()}T00:00:00`,
  } as any);

  await downloadBundleZip(report, filesPayload, { reportPdf, reportPdfFileName });
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
