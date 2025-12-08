import { Finding } from '../types';
import { generateId } from '../utils';
import PhotoUpload from './PhotoUpload';
import './FindingsList.css';

interface FindingsListProps {
  findings: Finding[];
  onFindingsChange: (findings: Finding[]) => void;
}

export default function FindingsList({ findings, onFindingsChange }: FindingsListProps) {
  const handleAddFinding = () => {
    const newFinding: Finding = {
      id: generateId(),
      text: '',
      photos: [],
    };
    onFindingsChange([...findings, newFinding]);
  };

  const handleRemoveFinding = (id: string) => {
    onFindingsChange(findings.filter((f) => f.id !== id));
  };

  const handleTextChange = (id: string, text: string) => {
    onFindingsChange(
      findings.map((f) => (f.id === id ? { ...f, text } : f))
    );
  };

  const handlePhotosChange = (id: string, photos: Finding['photos']) => {
    onFindingsChange(
      findings.map((f) => (f.id === id ? { ...f, photos } : f))
    );
  };

  return (
    <div className="findings-list section">
      <h3 className="section-title">الملاحظات | Findings</h3>

      {findings.length === 0 && (
        <p className="empty-message">لا توجد ملاحظات. اضغط "إضافة ملاحظة" لبدء الإضافة.</p>
      )}

      {findings.map((finding, index) => (
        <div key={finding.id} className="finding-item card">
          <div className="finding-header">
            <span className="finding-number">ملاحظة {index + 1}</span>
            <button
              type="button"
              onClick={() => handleRemoveFinding(finding.id)}
              className="remove-button danger small"
            >
              حذف
            </button>
          </div>

          <div className="field-group">
            <label htmlFor={`finding-text-${finding.id}`}>
              الوصف | Description
            </label>
            <textarea
              id={`finding-text-${finding.id}`}
              value={finding.text}
              onChange={(e) => handleTextChange(finding.id, e.target.value)}
              placeholder="اكتب الملاحظة هنا..."
              rows={3}
            />
          </div>

          <PhotoUpload
            photos={finding.photos}
            onPhotosChange={(photos) => handlePhotosChange(finding.id, photos)}
            label="صور الملاحظة | Finding Photos"
            multiple={true}
          />
        </div>
      ))}

      <button
        type="button"
        onClick={handleAddFinding}
        className="add-button secondary"
      >
        + إضافة ملاحظة
      </button>
    </div>
  );
}
