import { useState } from 'react';
import { Property } from '../types';
import { addProperty } from '../api';
import './AddPropertyModal.css';

interface AddPropertyModalProps {
  open: boolean;
  onClose: () => void;
  onPropertyAdded: (property: Property) => void;
}

export default function AddPropertyModal({ open, onClose, onPropertyAdded }: AddPropertyModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    waqfType: '',
    propertyType: '',
    endowedTo: '',
    building: '',
    unitNumber: '',
    road: '',
    area: '',
    governorate: '',
    block: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await addProperty(formData);
      onPropertyAdded(result.property);
      // Reset form
      setFormData({
        name: '',
        waqfType: '',
        propertyType: '',
        endowedTo: '',
        building: '',
        unitNumber: '',
        road: '',
        area: '',
        governorate: '',
        block: '',
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'فشل إضافة العقار | Failed to add property');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>إضافة عقار جديد | Add New Property</h3>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>

        {error && <div className="modal-error">{error}</div>}

        <div className="modal-body">
          <p className="modal-hint">جميع الحقول اختيارية | All fields are optional</p>

          <div className="modal-field">
            <label htmlFor="add-name">اسم العقار | Property Name</label>
            <input
              type="text"
              id="add-name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="أدخل اسم العقار (اختياري)"
            />
          </div>

          <div className="modal-field">
            <label htmlFor="add-waqfType">نوع الوقف | Waqf Type</label>
            <input
              type="text"
              id="add-waqfType"
              value={formData.waqfType}
              onChange={(e) => handleChange('waqfType', e.target.value)}
              placeholder="أدخل نوع الوقف"
            />
          </div>

          <div className="modal-field">
            <label htmlFor="add-propertyType">نوع العقار | Property Type</label>
            <input
              type="text"
              id="add-propertyType"
              value={formData.propertyType}
              onChange={(e) => handleChange('propertyType', e.target.value)}
              placeholder="أدخل نوع العقار"
            />
          </div>

          <div className="modal-field">
            <label htmlFor="add-endowedTo">موقوف على | Endowed To</label>
            <input
              type="text"
              id="add-endowedTo"
              value={formData.endowedTo}
              onChange={(e) => handleChange('endowedTo', e.target.value)}
              placeholder="أدخل موقوف على"
            />
          </div>

          <div className="modal-field">
            <label htmlFor="add-building">مبنى | Building</label>
            <input
              type="text"
              id="add-building"
              value={formData.building}
              onChange={(e) => handleChange('building', e.target.value)}
              placeholder="أدخل المبنى"
            />
          </div>

          <div className="modal-field">
            <label htmlFor="add-unitNumber">رقم الوحدة | Unit Number</label>
            <input
              type="text"
              id="add-unitNumber"
              value={formData.unitNumber}
              onChange={(e) => handleChange('unitNumber', e.target.value)}
              placeholder="أدخل رقم الوحدة"
            />
          </div>

          <div className="modal-field">
            <label htmlFor="add-road">طريق / شارع | Road / Street</label>
            <input
              type="text"
              id="add-road"
              value={formData.road}
              onChange={(e) => handleChange('road', e.target.value)}
              placeholder="أدخل الطريق / الشارع"
            />
          </div>

          <div className="modal-field">
            <label htmlFor="add-area">المنطقة | Area</label>
            <input
              type="text"
              id="add-area"
              value={formData.area}
              onChange={(e) => handleChange('area', e.target.value)}
              placeholder="أدخل المنطقة"
            />
          </div>

          <div className="modal-field">
            <label htmlFor="add-governorate">المحافظة | Governorate</label>
            <input
              type="text"
              id="add-governorate"
              value={formData.governorate}
              onChange={(e) => handleChange('governorate', e.target.value)}
              placeholder="أدخل المحافظة"
            />
          </div>

          <div className="modal-field">
            <label htmlFor="add-block">مجمع | Complex</label>
            <input
              type="text"
              id="add-block"
              value={formData.block}
              onChange={(e) => handleChange('block', e.target.value)}
              placeholder="أدخل المجمع"
            />
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="modal-cancel-btn" onClick={onClose} disabled={isSubmitting}>
            إلغاء | Cancel
          </button>
          <button type="button" className="modal-submit-btn" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <span className="loading"></span>
                <span>جاري الإضافة...</span>
              </>
            ) : (
              'إضافة | Add'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
