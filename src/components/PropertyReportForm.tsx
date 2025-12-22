import { useState, FormEvent, useMemo } from 'react';
import { Property, PropertyReport, Finding, Action, UploadedPhoto, ComplaintFile } from '../types';
import { submitReport, uploadFile, generateReportExports } from '../api';
import { isValidUrl } from '../utils';
import { printReport, validateReportForPdf, formatBahrainDate } from '../pdfUtils';
import { downloadReportZip, validateReportForZip } from '../zipUtils';
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

async function shareText(title: string, text: string) {
  const canShare = typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function';

  if (canShare) {
    try {
      await (navigator as any).share({ title, text });
      return { ok: true, method: 'share' as const };
    } catch {
      // user canceled or blocked
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    return { ok: true, method: 'clipboard' as const };
  } catch {
    return { ok: false, method: 'none' as const };
  }
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [zipError, setZipError] = useState<string | null>(null);

  const [isGeneratingExports, setIsGeneratingExports] = useState(false);
  const [exportsError, setExportsError] = useState<string | null>(null);
  const [exportsResult, setExportsResult] = useState<any | null>(null);

  const isMobile = useMemo(() => isProbablyMobile(), []);

  const handlePropertySelect = (property: Property | null) => {
    setSelectedProperty(property);
    setExportsResult(null);
    setExportsError(null);

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
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): string | null => {
    if (!selectedProperty) return 'يرجى اختيار العقار | Please select a property';
    if (!formData.visitType.trim()) return 'يرجى تحديد نوع الزيارة | Please specify visit type';

    if (formData.visitType === 'complaint' && !formData.complaint.trim()) {
      return 'يرجى كتابة تفاصيل البلاغ | Please enter complaint details';
    }

    if (formData.locationLink && !isValidUrl(formData.locationLink)) {
      return 'رابط الموقع غير صحيح | Invalid location link';
    }

    if (mainPhotos.length === 0) {
      return 'يرجى إضافة صورة واحدة على الأقل | Please add at least one photo';
    }

    for (const finding of findings) {
      if (!finding.text.trim()) {
        return 'يرجى كتابة وصف لجميع الملاحظات | Please add description for all findings';
      }
    }

    for (const action of actions) {
      if (!action.text.trim()) {
        return 'يرجى كتابة وصف لجميع الإجراءات | Please add description for all actions';
      }
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

  const generateExportsAfterSubmit = async (reportId: string) => {
    setIsGeneratingExports(true);
    setExportsError(null);
    setExportsResult(null);

    try {
      const result = await generateReportExports(reportId);
      setExportsResult(result?.exports || result);
      return result;
    } catch (error: any) {
      console.error('Exports generation error:', error);
      setExportsError(
        error.message ||
          'فشل تجهيز ملفات التصدير. يمكنك المحاولة مرة أخرى. | Failed to generate exports. You can try again.'
      );
      return null;
    } finally {
      setIsGeneratingExports(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setSubmitError(validationError);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!selectedProperty) return;

    setIsSubmitting(true);
    setSubmitError(null);
    setExportsError(null);
    setExportsResult(null);

    try {
      const uploadMainPhotos = async () => {
        const uploadPromises = mainPhotos.map((photo) =>
          uploadFile(photo.file, selectedProperty.code, formData.propertyType, formData.endowedTo, 'الصور الرئيسية')
        );
        const results = await Promise.all(uploadPromises);
        return mainPhotos.map((photo, index) => ({
          ...photo,
          uploadedUrl: results[index].url,
        }));
      };

      const uploadFindingPhotos = async (finding: Finding, findingIndex: number) => {
        if (finding.photos.length === 0) return finding;

        const findingNumber = findingIndex + 1;
        const findingDescription = finding.text.substring(0, 50);
        const findingFolderName = `Finding ${findingNumber} - ${findingDescription}`;

        const uploadPromises = finding.photos.map((photo) =>
          uploadFile(photo.file, selectedProperty.code, formData.propertyType, formData.endowedTo, findingFolderName)
        );
        const results = await Promise.all(uploadPromises);

        return {
          ...finding,
          photos: finding.photos.map((photo, index) => ({
            ...photo,
            uploadedUrl: results[index].url,
          })),
        };
      };

      const uploadComplaintFiles = async () => {
        if (complaintFiles.length === 0) return [];
        const uploadPromises = complaintFiles.map((file) =>
          uploadFile(file.file, selectedProperty.code, formData.propertyType, formData.endowedTo, 'ملفات البلاغ')
        );
        const results = await Promise.all(uploadPromises);
        return complaintFiles.map((file, index) => ({
          ...file,
          uploadedUrl: results[index].url,
        }));
      };

      const uploadedMainPhotos = await uploadMainPhotos();
      const uploadedComplaintFiles = await uploadComplaintFiles();
      const uploadedFindings = await Promise.all(findings.map((finding, index) => uploadFindingPhotos(finding, index)));

      const report: PropertyReport = {
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

        mainPhotos: uploadedMainPhotos,

        floorsCount: formData.floorsCount ? parseInt(formData.floorsCount) : undefined,
        flatsCount: formData.flatsCount ? parseInt(formData.flatsCount) : undefined,
        additionalNotes: formData.additionalNotes || undefined,

        visitType: formData.visitType,
        complaint: formData.complaint,
        complaintFiles: uploadedComplaintFiles,

        findings: uploadedFindings,
        actions,

        corrector: formData.corrector || undefined,
        submittedAt: new Date().toISOString(),
      };

      const response = await submitReport(report);

      if (!response.success) {
        throw new Error(response.message || 'Submission failed');
      }

      setSubmitSuccess(true);
      setSubmitError(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });

      if (response.reportId) {
        await generateExportsAfterSubmit(response.reportId);
      }

      setTimeout(() => {
        handlePropertySelect(null);
        setSubmitSuccess(false);
      }, 2500);
    } catch (error: any) {
      console.error('Submit error:', error);
      setSubmitError(error.message || 'فشل إرسال التقرير. حاول مرة أخرى. | Report submission failed. Try again.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = async () => {
    const currentReport = buildCurrentReport();
    if (!currentReport) return;

    const validationError = validateReportForPdf(currentReport);
    if (validationError) {
      setPdfError(validationError);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setPdfError(null);

    try {
      await printReport(currentReport);
    } catch (error: any) {
      console.error('Print error:', error);
      setPdfError(error.message || 'فشل فتح نافذة الطباعة. حاول مرة أخرى. | Failed to open print dialog. Try again.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleDownloadZip = async () => {
    const currentReport = buildCurrentReport();
    if (!currentReport) return;

    const validationError = validateReportForZip(currentReport);
    if (validationError) {
      setZipError(validationError);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsDownloadingZip(true);
    setZipError(null);

    try {
      await downloadReportZip(currentReport);
    } catch (error: any) {
      console.error('ZIP download error:', error);
      setZipError(error.message || 'فشل تحميل الملف. حاول مرة أخرى. | Failed to download ZIP. Try again.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const handleShareExportsLinks = async () => {
    if (!exportsResult) return;

    const pdfUrl = exportsResult?.pdf?.url || exportsResult?.exports?.pdf?.url;
    const zipUrl = exportsResult?.zip?.url || exportsResult?.exports?.zip?.url;
    const folderUrl = exportsResult?.exportsFolderUrl || exportsResult?.folderUrl;

    const lines = ['VisitProp Exports', pdfUrl ? `PDF: ${pdfUrl}` : '', zipUrl ? `ZIP: ${zipUrl}` : '', folderUrl ? `Folder: ${folderUrl}` : ''].filter(
      Boolean
    );

    const text = lines.join('\n');

    const result = await shareText('VisitProp Exports', text);
    if (!result.ok) {
      alert('Share not supported. Copy the links manually from the buttons.');
    }
  };

  const isFormDisabled = !selectedProperty;
  const isPrintButtonDisabled = !selectedProperty;
  const isZipButtonDisabled = !selectedProperty || isDownloadingZip;

  const currentReportForPdf = buildCurrentReport();

  return (
    <form onSubmit={handleSubmit} className="property-report-form">
      <div className="form-header">
        <h1 className="form-title">تقرير العقار</h1>
        <p className="form-subtitle">Property Inspection Report</p>
      </div>

      {submitError && (
        <div className="alert alert-error" role="alert">
          {submitError}
        </div>
      )}

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

      {exportsError && (
        <div className="alert alert-error" role="alert">
          {exportsError}
        </div>
      )}

      {submitSuccess && (
        <div className="alert alert-success" role="alert">
          تم إرسال التقرير بنجاح! ✓ | Report submitted successfully! ✓
        </div>
      )}

      {isGeneratingExports && (
        <div className="alert alert-success" role="status">
          Preparing PDF & ZIP and uploading to Drive...
        </div>
      )}

      {exportsResult && (
        <div className="alert alert-success" role="status" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontWeight: 700 }}>Exports are ready on Google Drive</div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {exportsResult?.pdf?.url && (
              <a className="zip-button" href={exportsResult.pdf.url} target="_blank" rel="noreferrer">
                Open PDF
              </a>
            )}
            {exportsResult?.zip?.url && (
              <a className="zip-button" href={exportsResult.zip.url} target="_blank" rel="noreferrer">
                Open ZIP
              </a>
            )}
            {(exportsResult?.exportsFolderUrl || exportsResult?.folderUrl) && (
              <a className="pdf-button" href={exportsResult.exportsFolderUrl || exportsResult.folderUrl} target="_blank" rel="noreferrer">
                Open Exports Folder
              </a>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" className="pdf-button" onClick={handleShareExportsLinks}>
              Share Links
            </button>

            {selectedProperty && (
              <button
                type="button"
                className="zip-button"
                onClick={() => {
                  alert('To regenerate exports, submit the report again (or add a dedicated regenerate action using reportId).');
                }}
              >
                Regenerate (optional)
              </button>
            )}
          </div>

          {isMobile && (
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              Tip: Use “Share Links” to send PDF/ZIP to WhatsApp or Email, then download later on PC.
            </div>
          )}
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
              <input type="text" id="waqfType" value={formData.waqfType} onChange={(e) => handleInputChange('waqfType', e.target.value)} placeholder="أدخل نوع الوقف" />
            </div>

            <div className="field-group">
              <label htmlFor="propertyType">نوع العقار | Property Type</label>
              <input type="text" id="propertyType" value={formData.propertyType} onChange={(e) => handleInputChange('propertyType', e.target.value)} placeholder="أدخل نوع العقار" />
            </div>

            <div className="field-group">
              <label htmlFor="endowedTo">موقوف على | Endowed To</label>
              <input type="text" id="endowedTo" value={formData.endowedTo} onChange={(e) => handleInputChange('endowedTo', e.target.value)} placeholder="أدخل موقوف على" />
            </div>

            <div className="field-group">
              <label htmlFor="building">مبنى | Building</label>
              <input type="text" id="building" value={formData.building} onChange={(e) => handleInputChange('building', e.target.value)} placeholder="أدخل المبنى" />
            </div>

            <div className="field-group">
              <label htmlFor="unitNumber">رقم الوحدة | Unit Number</label>
              <input type="text" id="unitNumber" value={formData.unitNumber} onChange={(e) => handleInputChange('unitNumber', e.target.value)} placeholder="أدخل رقم الوحدة" />
            </div>

            <div className="field-group">
              <label htmlFor="road">طريق / شارع | Road / Street</label>
              <input type="text" id="road" value={formData.road} onChange={(e) => handleInputChange('road', e.target.value)} placeholder="أدخل الطريق / الشارع" />
            </div>

            <div className="field-group">
              <label htmlFor="area">المنطقة | Area</label>
              <input type="text" id="area" value={formData.area} onChange={(e) => handleInputChange('area', e.target.value)} placeholder="أدخل المنطقة" />
            </div>

            <div className="field-group">
              <label htmlFor="governorate">المحافظة | Governorate</label>
              <input type="text" id="governorate" value={formData.governorate} onChange={(e) => handleInputChange('governorate', e.target.value)} placeholder="أدخل المحافظة" />
            </div>

            <div className="field-group">
              <label htmlFor="block">مجمع | Complex</label>
              <input type="text" id="block" value={formData.block} onChange={(e) => handleInputChange('block', e.target.value)} placeholder="أدخل المجمع" />
            </div>
          </div>

          <div className="section">
            <h3 className="section-title">الموقع | Location</h3>

            <div className="field-group">
              <label htmlFor="locationDescription">وصف الموقع | Location Description</label>
              <textarea id="locationDescription" value={formData.locationDescription} onChange={(e) => handleInputChange('locationDescription', e.target.value)} placeholder="اكتب وصف الموقع..." rows={3} />
            </div>

            <div className="field-group">
              <label htmlFor="locationLink">رابط الموقع | Location Link (Google Maps)</label>
              <input type="url" id="locationLink" value={formData.locationLink} onChange={(e) => handleInputChange('locationLink', e.target.value)} placeholder="https://maps.google.com/..." />
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
              <input type="number" id="floorsCount" value={formData.floorsCount} onChange={(e) => handleInputChange('floorsCount', e.target.value)} placeholder="مثال: 5" min="0" />
            </div>

            <div className="field-group">
              <label htmlFor="flatsCount">عدد الشقق | No. of Flats</label>
              <input type="number" id="flatsCount" value={formData.flatsCount} onChange={(e) => handleInputChange('flatsCount', e.target.value)} placeholder="مثال: 20" min="0" />
            </div>

            <div className="field-group">
              <label htmlFor="additionalNotes">ملاحظات إضافية | Additional Notes</label>
              <textarea id="additionalNotes" value={formData.additionalNotes} onChange={(e) => handleInputChange('additionalNotes', e.target.value)} placeholder="أي ملاحظات إضافية عن المبنى..." rows={4} />
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
                  <textarea id="complaint" value={formData.complaint} onChange={(e) => handleInputChange('complaint', e.target.value)} placeholder="اكتب تفاصيل البلاغ..." rows={4} required />
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
              <input type="text" id="corrector" value={formData.corrector} onChange={(e) => handleInputChange('corrector', e.target.value)} placeholder="أدخل اسم المصحح (اختياري)" />
            </div>
          </div>

          <div className="submit-section">
            <button type="button" className="pdf-button" onClick={handlePrint} disabled={isPrintButtonDisabled} title="طباعة أو حفظ كـ PDF | Print or Save as PDF">
              🖨️ طباعة / Print
            </button>

            <button type="button" className="zip-button" onClick={handleDownloadZip} disabled={isZipButtonDisabled} title="تحميل جميع الملفات | Download All Files">
              {isDownloadingZip ? (
                <>
                  <span className="loading"></span>
                  <span>جاري التحميل...</span>
                </>
              ) : (
                '📦 تحميل ZIP / Download ZIP'
              )}
            </button>

            <button type="submit" className="submit-button" disabled={isSubmitting || isGeneratingExports} title="إرسال التقرير | Submit report">
              {isSubmitting ? (
                <>
                  <span className="loading"></span>
                  <span>جاري الإرسال...</span>
                </>
              ) : (
                'إرسال / Submit'
              )}
            </button>
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
