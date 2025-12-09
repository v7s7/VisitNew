import { ComplaintFile } from '../types';
import './ComplaintFileUpload.css';

interface Props {
  files: ComplaintFile[];
  onFilesChange: (files: ComplaintFile[]) => void;
}

export default function ComplaintFileUpload({ files, onFilesChange }: Props) {
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    const newFiles: ComplaintFile[] = Array.from(selectedFiles).map((file) => ({
      localId: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      file,
      name: file.name,
      type: file.type,
      size: file.size,
    }));

    onFilesChange([...files, ...newFiles]);
    e.target.value = ''; // Reset input
  };

  const handleRemoveFile = (localId: string) => {
    onFilesChange(files.filter((f) => f.localId !== localId));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (type: string): string => {
    if (type.startsWith('image/')) return '🖼️';
    if (type === 'application/pdf') return '📄';
    if (type.startsWith('video/')) return '🎥';
    if (type.startsWith('audio/')) return '🎵';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('sheet') || type.includes('excel')) return '📊';
    if (type.includes('presentation') || type.includes('powerpoint')) return '📽️';
    if (type.includes('zip') || type.includes('rar') || type.includes('compressed')) return '🗜️';
    return '📎';
  };

  return (
    <div className="complaint-file-upload">
      <div className="upload-area">
        <label htmlFor="complaint-file-input" className="upload-label">
          <div className="upload-icon">📁</div>
          <div className="upload-text">
            <div className="upload-text-primary">
              اضغط لإضافة ملفات | Click to add files
            </div>
            <div className="upload-text-secondary">
              PDF, صور, مستندات، فيديو، الخ | PDF, Images, Documents, Videos, etc.
            </div>
          </div>
        </label>
        <input
          type="file"
          id="complaint-file-input"
          onChange={handleFileSelect}
          multiple
          accept="*/*"
          style={{ display: 'none' }}
        />
      </div>

      {files.length > 0 && (
        <div className="files-list">
          {files.map((file) => (
            <div key={file.localId} className="file-item">
              <div className="file-icon">{getFileIcon(file.type)}</div>
              <div className="file-info">
                <div className="file-name">{file.name}</div>
                <div className="file-meta">
                  {formatFileSize(file.size)}
                  {file.type && ` • ${file.type.split('/')[1]?.toUpperCase()}`}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveFile(file.localId)}
                className="remove-file-btn"
                aria-label="Remove file"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="file-count">
        {files.length > 0 ? (
          <>
            {files.length} {files.length === 1 ? 'ملف' : 'ملفات'} | {files.length} file{files.length !== 1 ? 's' : ''}
          </>
        ) : (
          <>لا توجد ملفات | No files added</>
        )}
      </div>
    </div>
  );
}
