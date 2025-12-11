import { PropertyReport } from '../types';
import { formatFileSize } from '../utils';
import './PropertyReportPdfView.css';

interface PropertyReportPdfViewProps {
  report: PropertyReport;
  generatedDate: string;
}

export default function PropertyReportPdfView({ report, generatedDate }: PropertyReportPdfViewProps) {
  return (
    <div className="pdf-report" dir="rtl">
      {/* Header */}
      <div className="pdf-header">
        <h1 className="pdf-title">تقرير معاينة العقار</h1>
        <h2 className="pdf-subtitle">Property Inspection Report</h2>
        <div className="pdf-metadata">
          <div>{generatedDate}</div>
        </div>
      </div>

      {/* Property Information */}
      <section className="pdf-section">
        <h3 className="pdf-section-title">بيانات العقار | Property Information</h3>
        <div className="pdf-field-grid">
          {report.waqfType && (
            <div className="pdf-field">
              <span className="pdf-label">نوع الوقف | Waqf Type:</span>
              <span className="pdf-value">{report.waqfType}</span>
            </div>
          )}
          {report.propertyType && (
            <div className="pdf-field">
              <span className="pdf-label">نوع العقار | Property Type:</span>
              <span className="pdf-value">{report.propertyType}</span>
            </div>
          )}
          {report.endowedTo && (
            <div className="pdf-field">
              <span className="pdf-label">موقوف على | Endowed To:</span>
              <span className="pdf-value">{report.endowedTo}</span>
            </div>
          )}
          {report.building && (
            <div className="pdf-field">
              <span className="pdf-label">مبنى | Building:</span>
              <span className="pdf-value">{report.building}</span>
            </div>
          )}
          {report.unitNumber && (
            <div className="pdf-field">
              <span className="pdf-label">رقم الوحدة | Unit Number:</span>
              <span className="pdf-value">{report.unitNumber}</span>
            </div>
          )}
          {report.road && (
            <div className="pdf-field">
              <span className="pdf-label">الطريق | Road:</span>
              <span className="pdf-value">{report.road}</span>
            </div>
          )}
          {report.area && (
            <div className="pdf-field">
              <span className="pdf-label">المنطقة | Area:</span>
              <span className="pdf-value">{report.area}</span>
            </div>
          )}
          {report.governorate && (
            <div className="pdf-field">
              <span className="pdf-label">المحافظة | Governorate:</span>
              <span className="pdf-value">{report.governorate}</span>
            </div>
          )}
          {report.block && (
            <div className="pdf-field">
              <span className="pdf-label">المجمع | Complex:</span>
              <span className="pdf-value">{report.block}</span>
            </div>
          )}
        </div>
      </section>

      {/* Location */}
      {(report.locationDescription || report.locationLink) && (
        <section className="pdf-section">
          <h3 className="pdf-section-title">الموقع | Location</h3>
          {report.locationDescription && (
            <div className="pdf-field">
              <span className="pdf-label">وصف الموقع | Description:</span>
              <span className="pdf-value">{report.locationDescription}</span>
            </div>
          )}
          {report.locationLink && (
            <div className="pdf-field">
              <span className="pdf-label">رابط الموقع | Link:</span>
              <a href={report.locationLink} className="pdf-link" target="_blank" rel="noopener noreferrer">
                {report.locationLink}
              </a>
            </div>
          )}
        </section>
      )}

      {/* Building Details */}
      {(report.floorsCount || report.flatsCount || report.additionalNotes) && (
        <section className="pdf-section">
          <h3 className="pdf-section-title">تفاصيل المبنى | Building Details</h3>
          {report.floorsCount !== undefined && (
            <div className="pdf-field">
              <span className="pdf-label">عدد الطوابق | Floors:</span>
              <span className="pdf-value">{report.floorsCount}</span>
            </div>
          )}
          {report.flatsCount !== undefined && (
            <div className="pdf-field">
              <span className="pdf-label">عدد الشقق | Flats:</span>
              <span className="pdf-value">{report.flatsCount}</span>
            </div>
          )}
          {report.additionalNotes && (
            <div className="pdf-field">
              <span className="pdf-label">ملاحظات إضافية | Notes:</span>
              <span className="pdf-value">{report.additionalNotes}</span>
            </div>
          )}
        </section>
      )}

      {/* Main Photos */}
      {report.mainPhotos.length > 0 && (
        <section className="pdf-section">
          <h3 className="pdf-section-title">الصور الرئيسية | Main Photos</h3>
          <div className="pdf-photo-grid">
            {report.mainPhotos.map((photo, index) => (
              <div key={photo.localId} className="pdf-photo-item">
                {photo.uploadedUrl ? (
                  <a href={photo.uploadedUrl} target="_blank" rel="noopener noreferrer" className="pdf-photo-link">
                    <img
                      src={photo.previewUrl || URL.createObjectURL(photo.file)}
                      alt={`Photo ${index + 1}`}
                      className="pdf-photo-thumbnail"
                    />
                    <div className="pdf-photo-label">صورة {index + 1}</div>
                  </a>
                ) : (
                  <div className="pdf-photo-wrapper">
                    <img
                      src={photo.previewUrl || URL.createObjectURL(photo.file)}
                      alt={`Photo ${index + 1}`}
                      className="pdf-photo-thumbnail"
                    />
                    <div className="pdf-photo-label">صورة {index + 1}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Visit Information */}
      {report.visitType && (
        <section className="pdf-section">
          <h3 className="pdf-section-title">معلومات الزيارة | Visit Information</h3>
          <div className="pdf-field">
            <span className="pdf-label">نوع الزيارة | Visit Type:</span>
            <span className="pdf-value">
              {report.visitType === 'routine' ? 'زيارة دورية | Routine Visit' : 'بلاغ | Complaint'}
            </span>
          </div>
          {report.complaint && (
            <div className="pdf-field">
              <span className="pdf-label">تفاصيل البلاغ | Complaint Details:</span>
              <span className="pdf-value">{report.complaint}</span>
            </div>
          )}

          {/* Complaint Files inside Visit Information */}
          {report.complaintFiles.length > 0 && (
            <>
              <div className="pdf-field" style={{ marginTop: '12px' }}>
                <span className="pdf-label">ملفات البلاغ | Complaint Files:</span>
              </div>
              <div className="pdf-file-list">
                {report.complaintFiles.map((file, index) => (
                  <div key={file.localId} className="pdf-file-item">
                    <span className="pdf-file-number">{index + 1}.</span>
                    {file.uploadedUrl ? (
                      <a href={file.uploadedUrl} target="_blank" rel="noopener noreferrer" className="pdf-file-link">
                        {file.name}
                      </a>
                    ) : (
                      <span className="pdf-file-name">{file.name}</span>
                    )}
                    <span className="pdf-file-info">
                      ({file.type} • {formatFileSize(file.size)})
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* Findings */}
      {report.findings.length > 0 && (
        <section className="pdf-section">
          <h3 className="pdf-section-title">الملاحظات | Findings</h3>
          {report.findings.map((finding, findingIndex) => (
            <div key={finding.id} className="pdf-finding">
              <div className="pdf-finding-header">
                <strong>ملاحظة {findingIndex + 1} | Finding {findingIndex + 1}:</strong> {finding.text}
              </div>
              {finding.photos.length > 0 && (
                <div className="pdf-photo-grid pdf-finding-photos">
                  {finding.photos.map((photo, photoIndex) => (
                    <div key={photo.localId} className="pdf-photo-item">
                      {photo.uploadedUrl ? (
                        <a href={photo.uploadedUrl} target="_blank" rel="noopener noreferrer" className="pdf-photo-link">
                          <img
                            src={photo.previewUrl || URL.createObjectURL(photo.file)}
                            alt={`Finding ${findingIndex + 1} Photo ${photoIndex + 1}`}
                            className="pdf-photo-thumbnail"
                          />
                          <div className="pdf-photo-label">صورة {photoIndex + 1}</div>
                        </a>
                      ) : (
                        <div className="pdf-photo-wrapper">
                          <img
                            src={photo.previewUrl || URL.createObjectURL(photo.file)}
                            alt={`Finding ${findingIndex + 1} Photo ${photoIndex + 1}`}
                            className="pdf-photo-thumbnail"
                          />
                          <div className="pdf-photo-label">صورة {photoIndex + 1}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Actions */}
      {report.actions.length > 0 && (
        <section className="pdf-section">
          <h3 className="pdf-section-title">الإجراءات | Actions</h3>
          <ol className="pdf-action-list">
            {report.actions.map((action) => (
              <li key={action.id} className="pdf-action-item">
                {action.text}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Corrector */}
      {report.corrector && (
        <section className="pdf-section">
          <div className="pdf-field">
            <span className="pdf-label">المصحح | Corrector:</span>
            <span className="pdf-value">{report.corrector}</span>
          </div>
        </section>
      )}
    </div>
  );
}
