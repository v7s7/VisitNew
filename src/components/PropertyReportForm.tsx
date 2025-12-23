import { useState, useMemo, useEffect } from 'react';
import { Property, PropertyReport, Finding, Action, UploadedPhoto, ComplaintFile } from '../types';
import { isValidUrl } from '../utils';
import { validateReportForPdf, formatBahrainDate, generatePdfFilename } from '../pdfUtils';
import { downloadBundleZip } from '../api';

import PropertySearch from './PropertySearch';
import PhotoUpload from './PhotoUpload';
import ComplaintFileUpload from './ComplaintFileUpload';
import FindingsList from './FindingsList';
import ActionsList from './ActionsList';
import PropertyReportPdfView from './PropertyReportPdfView';
import './PropertyReportForm.css';

function isProbablyMobile() {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || window.innerWidth < 768;
}

function hasMeaningfulReportData(report: PropertyReport): boolean {
  const hasText = (v?: string) => !!(v && v.trim());
  const hasAnyFindingText = report.findings?.some((f) => hasText(f.text)) ?? false;
  const hasAnyActionText = report.actions?.some((a) => hasText(a.text)) ?? false;

  const hasAnyFiles =
    (report.mainPhotos?.length ?? 0) > 0 ||
    (report.findings?.some((f) => (f.photos?.length ?? 0) > 0) ?? false) ||
    (report.complaintFiles?.length ?? 0) > 0;

  return (
    hasText(report.visitType) ||
    hasText(report.locationDescription) ||
    hasText(report.locationLink) ||
    hasText(report.additionalNotes) ||
    hasText(report.complaint) ||
    hasAnyFindingText ||
    hasAnyActionText ||
    hasAnyFiles
  );
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

async function buildPdfHtmlFromDom(pdfContentId: string = 'pdf-content'): Promise<string> {
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

export default function PropertyReportForm() {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [formData, setFormData] = useState({
    waqfType: '',
    propertyType: '',
    endowedTo: '',
    building: '',
    unitNumber: '',
    road: '',
    area: '',
    governorate: '',
    block: '',
    locationDescription: '',
    locationLink: '',
    floorsCount: '',
    flatsCount: '',
    additionalNotes: '',
    visitType: '',
    complaint: '',
    corrector: '',
  });

  const [mainPhotos, setMainPhotos] = useState<UploadedPhoto[]>([]);
  const [complaintFiles, setComplaintFiles] = useState<ComplaintFile[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [actions, setActions] = useState<Action[]>([]);

  const [pdfError, setPdfError] = useState<string | null>(null);
  const [zipError, setZipError] = useState<string | null>(null);

  const [printQueued, setPrintQueued] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);

  const isMobile = useMemo(() => isProbablyMobile(), []);

  const handlePropertySelect = (property: Property | null) => {
    setSelectedProperty(property);

    if (property) {
      setFormData((prev) => ({
        ...prev,
        waqfType: property.waqfType || '',
        propertyType: property.propertyType || '',
        endowedTo: property.endowedTo || '',
        building: property.building || '',
        unitNumber: property.unitNumber || '',
        road: property.road || '',
        area: property.area || '',
        governorate: property.governorate || '',
        block: property.block || '',
        locationLink: property.defaultLocationLink || prev.locationLink,
      }));
      return;
    }

    setFormData({
      waqfType: '',
      propertyType: '',
      endowedTo: '',
      building: '',
      unitNumber: '',
      road: '',
      area: '',
      governorate: '',
      block: '',
      locationDescription: '',
      locationLink: '',
      floorsCount: '',
      flatsCount: '',
      additionalNotes: '',
      visitType: '',
      complaint: '',
      corrector: '',
    });
    setMainPhotos([]);
    setComplaintFiles([]);
    setFindings([]);
    setActions([]);
    setPdfError(null);
    setZipError(null);
    setPrintQueued(false);
    setIsDownloadingZip(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForExport = (): string | null => {
    if (!selectedProperty) return 'يرجى اختيار العقار | Please select a property';
    if (!formData.visitType.trim()) return 'يرجى تحديد نوع الزيارة | Please specify visit type';

    if (formData.visitType === 'complaint' && !formData.complaint.trim()) {
      return 'يرجى كتابة تفاصيل البلاغ | Please enter complaint details';
    }

    if (formData.locationLink && !isValidUrl(formData.locationLink)) {
      return 'رابط الموقع غير صحيح | Invalid location link';
    }

    return null;
  };

  const buildCurrentReport = (): PropertyReport | null => {
    if (!selectedProperty) return null;

    return {
      propertyId: selectedProperty.id,
      propertyCode: selectedProperty.code,
      propertyName: selectedProperty.name,

      waqfType: formData.waqfType,
      propertyType: formData.propertyType,
      endowedTo: formData.endowedTo,
      building: formData.building,
      unitNumber: formData.unitNumber,
      road: formData.road,
      area: formData.area,
      governorate: formData.governorate,
      block: formData.block,

      locationDescription: formData.locationDescription,
      locationLink: formData.locationLink,

      mainPhotos,
      floorsCount: formData.floorsCount ? parseInt(formData.floorsCount) : undefined,
      flatsCount: formData.flatsCount ? parseInt(formData.flatsCount) : undefined,
      additionalNotes: formData.additionalNotes || undefined,

      visitType: formData.visitType,
      complaint: formData.complaint,
      complaintFiles,

      findings,
      actions,

      corrector: formData.corrector || undefined,
    };
  };

  useEffect(() => {
    if (!printQueued) return;

    const run = async () => {
      const currentReport = buildCurrentReport();
      if (!currentReport) {
        setPrintQueued(false);
        return;
      }

      try {
        await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

        const validationError = validateReportForPdf(currentReport);
        if (validationError) {
          setPdfError(validationError);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }

        window.print();
      } catch (error: any) {
        console.error('Print error:', error);
        setPdfError(error.message || 'فشل فتح نافذة الطباعة. حاول مرة أخرى. | Failed to open print dialog. Try again.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } finally {
        setPrintQueued(false);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [printQueued]);

  const handlePrint = async () => {
    const currentReport = buildCurrentReport();
    if (!currentReport) return;

    const baseValidation = validateForExport();
    if (baseValidation) {
      setPdfError(baseValidation);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!hasMeaningfulReportData(currentReport)) {
      setPdfError('اكتب أي بيانات أو أضف ملفات قبل الطباعة | Add some info or files before printing');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setPdfError(null);
    setPrintQueued(true);
  };

  const handleDownloadZip = async () => {
    const currentReport = buildCurrentReport();
    if (!currentReport) return;

    const baseValidation = validateForExport();
    if (baseValidation) {
      setZipError(baseValidation);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!hasMeaningfulReportData(currentReport)) {
      setZipError('اكتب أي بيانات أو أضف ملفات قبل التحميل | Add some info or files before downloading');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsDownloadingZip(true);
    setZipError(null);

    try {
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

      const pdfValidationError = validateReportForPdf(currentReport);
      if (pdfValidationError) {
        setZipError(pdfValidationError);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const filesPayload: Array<{ field: string; file: File }> = [];

      for (const p of mainPhotos) {
        if (p?.file) filesPayload.push({ field: 'mainPhotos', file: p.file });
      }

      for (const f of complaintFiles) {
        if (f?.file) filesPayload.push({ field: 'complaintFiles', file: f.file });
      }

      findings.forEach((finding, idx) => {
        const field = `findingPhotos__${idx}`;
        (finding.photos || []).forEach((p) => {
          if (p?.file) filesPayload.push({ field, file: p.file });
        });
      });

      // Build HTML from the same Print DOM and send it to backend to generate a REAL PDF (Chromium print)
      const pdfHtml = await buildPdfHtmlFromDom('pdf-content');
      const pdfFileName = generatePdfFilename(currentReport);

      await downloadBundleZip(currentReport, filesPayload, {
        pdfHtml,
        pdfFileName,
      });
    } catch (error: any) {
      console.error('ZIP download error:', error);
      setZipError(error.message || 'فشل تحميل الملف. حاول مرة أخرى. | Failed to download ZIP. Try again.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const isFormDisabled = !selectedProperty;
  const isPrintButtonDisabled = !selectedProperty || printQueued;
  const isZipButtonDisabled = !selectedProperty || isDownloadingZip;

  const currentReportForPdf = buildCurrentReport();

  return (
    <form onSubmit={(e) => e.preventDefault()} className="property-report-form">
      <div className="form-header">
        <h1 className="form-title">تقرير العقار</h1>
        <p className="form-subtitle">Property Inspection Report</p>
      </div>

      {pdfError && (
        <div className="alert alert-error" role="alert">
          {pdfError}
        </div>
      )}

      {zipError && (
        <div className="alert alert-error" role="alert">
          {zipError}
        </div>
      )}

      <PropertySearch onPropertySelect={handlePropertySelect} selectedProperty={selectedProperty} />

      {isFormDisabled && (
        <div className="form-disabled-message">
          يرجى اختيار العقار أولاً لإكمال التقرير
          <br />
          Please select a property first to complete the report
        </div>
      )}

      {selectedProperty && (
        <>
          <div className="section">
            <h3 className="section-title">بيانات العقار | Property Details</h3>

            <div className="field-group">
              <label htmlFor="waqfType">نوع الوقف | Waqf Type</label>
              <input
                type="text"
                id="waqfType"
                value={formData.waqfType}
                onChange={(e) => handleInputChange('waqfType', e.target.value)}
                placeholder="أدخل نوع الوقف"
              />
            </div>

            <div className="field-group">
              <label htmlFor="propertyType">نوع العقار | Property Type</label>
              <input
                type="text"
                id="propertyType"
                value={formData.propertyType}
                onChange={(e) => handleInputChange('propertyType', e.target.value)}
                placeholder="أدخل نوع العقار"
              />
            </div>

            <div className="field-group">
              <label htmlFor="endowedTo">موقوف على | Endowed To</label>
              <input
                type="text"
                id="endowedTo"
                value={formData.endowedTo}
                onChange={(e) => handleInputChange('endowedTo', e.target.value)}
                placeholder="أدخل موقوف على"
              />
            </div>

            <div className="field-group">
              <label htmlFor="building">مبنى | Building</label>
              <input
                type="text"
                id="building"
                value={formData.building}
                onChange={(e) => handleInputChange('building', e.target.value)}
                placeholder="أدخل المبنى"
              />
            </div>

            <div className="field-group">
              <label htmlFor="unitNumber">رقم الوحدة | Unit Number</label>
              <input
                type="text"
                id="unitNumber"
                value={formData.unitNumber}
                onChange={(e) => handleInputChange('unitNumber', e.target.value)}
                placeholder="أدخل رقم الوحدة"
              />
            </div>

            <div className="field-group">
              <label htmlFor="road">طريق / شارع | Road / Street</label>
              <input
                type="text"
                id="road"
                value={formData.road}
                onChange={(e) => handleInputChange('road', e.target.value)}
                placeholder="أدخل الطريق / الشارع"
              />
            </div>

            <div className="field-group">
              <label htmlFor="area">المنطقة | Area</label>
              <input
                type="text"
                id="area"
                value={formData.area}
                onChange={(e) => handleInputChange('area', e.target.value)}
                placeholder="أدخل المنطقة"
              />
            </div>

            <div className="field-group">
              <label htmlFor="governorate">المحافظة | Governorate</label>
              <input
                type="text"
                id="governorate"
                value={formData.governorate}
                onChange={(e) => handleInputChange('governorate', e.target.value)}
                placeholder="أدخل المحافظة"
              />
            </div>

            <div className="field-group">
              <label htmlFor="block">مجمع | Complex</label>
              <input
                type="text"
                id="block"
                value={formData.block}
                onChange={(e) => handleInputChange('block', e.target.value)}
                placeholder="أدخل المجمع"
              />
            </div>
          </div>

          <div className="section">
            <h3 className="section-title">الموقع | Location</h3>

            <div className="field-group">
              <label htmlFor="locationDescription">وصف الموقع | Location Description</label>
              <textarea
                id="locationDescription"
                value={formData.locationDescription}
                onChange={(e) => handleInputChange('locationDescription', e.target.value)}
                placeholder="اكتب وصف الموقع..."
                rows={3}
              />
            </div>

            <div className="field-group">
              <label htmlFor="locationLink">رابط الموقع | Location Link (Google Maps)</label>
              <input
                type="url"
                id="locationLink"
                value={formData.locationLink}
                onChange={(e) => handleInputChange('locationLink', e.target.value)}
                placeholder="https://maps.google.com/..."
              />
            </div>
          </div>

          <div className="section">
            <h3 className="section-title">الصور الرئيسية | Main Photos</h3>
            <PhotoUpload photos={mainPhotos} onPhotosChange={setMainPhotos} />
          </div>

          <div className="section">
            <h3 className="section-title">تفاصيل المبنى (اختياري) | Building Details (Optional)</h3>

            <div className="field-group">
              <label htmlFor="floorsCount">عدد الطوابق | No. of Floors</label>
              <input
                type="number"
                id="floorsCount"
                value={formData.floorsCount}
                onChange={(e) => handleInputChange('floorsCount', e.target.value)}
                placeholder="مثال: 5"
                min="0"
              />
            </div>

            <div className="field-group">
              <label htmlFor="flatsCount">عدد الشقق | No. of Flats</label>
              <input
                type="number"
                id="flatsCount"
                value={formData.flatsCount}
                onChange={(e) => handleInputChange('flatsCount', e.target.value)}
                placeholder="مثال: 20"
                min="0"
              />
            </div>

            <div className="field-group">
              <label htmlFor="additionalNotes">ملاحظات إضافية | Additional Notes</label>
              <textarea
                id="additionalNotes"
                value={formData.additionalNotes}
                onChange={(e) => handleInputChange('additionalNotes', e.target.value)}
                placeholder="أي ملاحظات إضافية عن المبنى..."
                rows={4}
              />
            </div>
          </div>

          <div className="section">
            <h3 className="section-title">معلومات الزيارة | Visit Information</h3>

            <div className="field-group">
              <label htmlFor="visitType">نوع الزيارة | Visit Type *</label>
              <select
                id="visitType"
                value={formData.visitType}
                onChange={(e) => handleInputChange('visitType', e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '16px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                <option value="">-- اختر نوع الزيارة | Select Visit Type --</option>
                <option value="routine">زيارة دورية | Routine Visit</option>
                <option value="complaint">بلاغ | Complaint</option>
              </select>
            </div>

            {formData.visitType === 'complaint' && (
              <>
                <div className="field-group">
                  <label htmlFor="complaint">تفاصيل البلاغ | Complaint Details *</label>
                  <textarea
                    id="complaint"
                    value={formData.complaint}
                    onChange={(e) => handleInputChange('complaint', e.target.value)}
                    placeholder="اكتب تفاصيل البلاغ..."
                    rows={4}
                    required
                  />
                </div>

                <div className="field-group">
                  <label>ملفات البلاغ | Complaint Files (Optional)</label>
                  <ComplaintFileUpload files={complaintFiles} onFilesChange={setComplaintFiles} />
                </div>
              </>
            )}
          </div>

          <FindingsList findings={findings} onFindingsChange={setFindings} />
          <ActionsList actions={actions} onActionsChange={setActions} />

          <div className="section">
            <h3 className="section-title">المصحح | Corrector (Optional)</h3>
            <div className="field-group">
              <label htmlFor="corrector">اسم المصحح | Corrector Name</label>
              <input
                type="text"
                id="corrector"
                value={formData.corrector}
                onChange={(e) => handleInputChange('corrector', e.target.value)}
                placeholder="أدخل اسم المصحح (اختياري)"
              />
            </div>
          </div>

          <div className="submit-section">
            <button
              type="button"
              className="pdf-button"
              onClick={handlePrint}
              disabled={isPrintButtonDisabled}
              title="طباعة أو حفظ كـ PDF | Print or Save as PDF"
            >
              {printQueued ? (
                <>
                  <span className="loading"></span>
                  <span>جاري التحضير...</span>
                </>
              ) : (
                '🖨️ طباعة / Print'
              )}
            </button>

            <button
              type="button"
              className="zip-button"
              onClick={handleDownloadZip}
              disabled={isZipButtonDisabled}
              title="تحميل جميع الملفات | Download All Files"
            >
              {isDownloadingZip ? (
                <>
                  <span className="loading"></span>
                  <span>جاري التحميل...</span>
                </>
              ) : (
                '📦 تحميل ZIP / Download ZIP'
              )}
            </button>

            {isMobile && (
              <div style={{ fontSize: 12, opacity: 0.8, paddingTop: 6 }}>
                Tip: Download ZIP to keep everything together (PDF + photos).
              </div>
            )}
          </div>
        </>
      )}

      {currentReportForPdf && (
        <div id="pdf-content" className="pdf-content-hidden">
          <PropertyReportPdfView report={currentReportForPdf} generatedDate={formatBahrainDate()} />
        </div>
      )}
    </form>
  );
}
