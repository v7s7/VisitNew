import { useState, FormEvent } from 'react';
import { Property, PropertyReport, Finding, Action, UploadedPhoto, ComplaintFile } from '../types';
import { submitReport, uploadFile } from '../api';
import { isValidUrl } from '../utils';
import PropertySearch from './PropertySearch';
import PhotoUpload from './PhotoUpload';
import ComplaintFileUpload from './ComplaintFileUpload';
import FindingsList from './FindingsList';
import ActionsList from './ActionsList';
import './PropertyReportForm.css';

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

  // Auto-fill fields when property is selected
  const handlePropertySelect = (property: Property | null) => {
    setSelectedProperty(property);
    if (property) {
      setFormData({
        ...formData,
        waqfType: property.waqfType || '',
        propertyType: property.propertyType || '',
        endowedTo: property.endowedTo || '',
        building: property.building || '',
        unitNumber: property.unitNumber || '',
        road: property.road || '',
        area: property.area || '',
        governorate: property.governorate || '',
        block: property.block || '',
        locationLink: property.defaultLocationLink || formData.locationLink,
      });
    } else {
      // Reset form when property is deselected
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
        visitType: '',
        complaint: '',
        corrector: '',
      });
      setMainPhotos([]);
      setComplaintFiles([]);
      setFindings([]);
      setActions([]);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const validateForm = (): string | null => {
    if (!selectedProperty) {
      return 'يرجى اختيار العقار | Please select a property';
    }

    if (!formData.visitType.trim()) {
      return 'يرجى تحديد نوع الزيارة | Please specify visit type';
    }

    // Only require complaint if visit type is "complaint"
    if (formData.visitType === 'complaint' && !formData.complaint.trim()) {
      return 'يرجى كتابة تفاصيل البلاغ | Please enter complaint details';
    }

    if (formData.locationLink && !isValidUrl(formData.locationLink)) {
      return 'رابط الموقع غير صحيح | Invalid location link';
    }

    if (mainPhotos.length === 0) {
      return 'يرجى إضافة صورة واحدة على الأقل | Please add at least one photo';
    }

    // Validate findings have text if they exist
    for (const finding of findings) {
      if (!finding.text.trim()) {
        return 'يرجى كتابة وصف لجميع الملاحظات | Please add description for all findings';
      }
    }

    // Validate actions have text if they exist
    for (const action of actions) {
      if (!action.text.trim()) {
        return 'يرجى كتابة وصف لجميع الإجراءات | Please add description for all actions';
      }
    }

    return null;
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

    try {
      // Upload all photos first
      const uploadMainPhotos = async () => {
        const uploadPromises = mainPhotos.map((photo) =>
          uploadFile(photo.file, selectedProperty.code)
        );
        const results = await Promise.all(uploadPromises);
        return mainPhotos.map((photo, index) => ({
          ...photo,
          uploadedUrl: results[index].url,
        }));
      };

      const uploadFindingPhotos = async (finding: Finding) => {
        if (finding.photos.length === 0) return finding;
        const uploadPromises = finding.photos.map((photo) =>
          uploadFile(photo.file, selectedProperty.code)
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
          uploadFile(file.file, selectedProperty.code)
        );
        const results = await Promise.all(uploadPromises);
        return complaintFiles.map((file, index) => ({
          ...file,
          uploadedUrl: results[index].url,
        }));
      };

      const uploadedMainPhotos = await uploadMainPhotos();
      const uploadedComplaintFiles = await uploadComplaintFiles();
      const uploadedFindings = await Promise.all(findings.map(uploadFindingPhotos));

      // Prepare report data
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
        visitType: formData.visitType,
        complaint: formData.complaint,
        complaintFiles: uploadedComplaintFiles,
        findings: uploadedFindings,
        actions: actions,
        corrector: formData.corrector || undefined,
        submittedAt: new Date().toISOString(),
      };

      // Submit report
      const response = await submitReport(report);

      if (response.success) {
        setSubmitSuccess(true);
        setSubmitError(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Reset form after 2 seconds
        setTimeout(() => {
          handlePropertySelect(null);
          setSubmitSuccess(false);
        }, 2000);
      } else {
        throw new Error(response.message || 'Submission failed');
      }
    } catch (error: any) {
      console.error('Submit error:', error);
      setSubmitError(
        error.message || 'فشل إرسال التقرير. حاول مرة أخرى. | Report submission failed. Try again.'
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormDisabled = !selectedProperty;

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

      {submitSuccess && (
        <div className="alert alert-success" role="alert">
          تم إرسال التقرير بنجاح! ✓ | Report submitted successfully! ✓
        </div>
      )}

      {/* Property Selection */}
      <PropertySearch
        onPropertySelect={handlePropertySelect}
        selectedProperty={selectedProperty}
      />

      {isFormDisabled && (
        <div className="form-disabled-message">
          يرجى اختيار العقار أولاً لإكمال التقرير
          <br />
          Please select a property first to complete the report
        </div>
      )}

      {/* Property Details (Editable) */}
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

          {/* Location Description and Link */}
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

          {/* Main Photos */}
          <div className="section">
            <h3 className="section-title">الصور الرئيسية | Main Photos</h3>
            <PhotoUpload photos={mainPhotos} onPhotosChange={setMainPhotos} />
          </div>

          {/* Visit Type and Complaint */}
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
                  <ComplaintFileUpload
                    files={complaintFiles}
                    onFilesChange={setComplaintFiles}
                  />
                </div>
              </>
            )}
          </div>

          {/* Findings */}
          <FindingsList findings={findings} onFindingsChange={setFindings} />

          {/* Actions */}
          <ActionsList actions={actions} onActionsChange={setActions} />

          {/* Corrector (Optional) */}
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

          {/* Submit Button */}
          <div className="submit-section">
            <button
              type="submit"
              className="submit-button"
              disabled={isSubmitting || isFormDisabled}
            >
              {isSubmitting ? (
                <>
                  <span className="loading"></span>
                  <span>جاري الإرسال...</span>
                </>
              ) : (
                'إرسال التقرير | Submit Report'
              )}
            </button>
          </div>
        </>
      )}
    </form>
  );
}
