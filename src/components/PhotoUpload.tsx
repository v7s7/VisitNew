import { useRef } from 'react';
import { UploadedPhoto } from '../types';
import { generateId, createImagePreview, isImageFile } from '../utils';
import './PhotoUpload.css';

interface PhotoUploadProps {
  photos: UploadedPhoto[];
  onPhotosChange: (photos: UploadedPhoto[]) => void;
  label?: string;
  multiple?: boolean;
}

export default function PhotoUpload({
  photos,
  onPhotosChange,
  label = 'الصور | Photos',
  multiple = true,
}: PhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (files.length === 0) return;

    // Validate file types
    const invalidFiles = files.filter((file) => !isImageFile(file));
    if (invalidFiles.length > 0) {
      alert('يرجى اختيار ملفات صور فقط | Please select image files only');
      return;
    }

    // Create photo objects with preview URLs
    const newPhotos: UploadedPhoto[] = files.map((file) => ({
      localId: generateId(),
      file,
      previewUrl: createImagePreview(file),
    }));

    if (multiple) {
      onPhotosChange([...photos, ...newPhotos]);
    } else {
      // Replace existing photos if not multiple
      onPhotosChange(newPhotos);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (localId: string) => {
    const photoToRemove = photos.find((p) => p.localId === localId);
    if (photoToRemove?.previewUrl) {
      URL.revokeObjectURL(photoToRemove.previewUrl);
    }

    onPhotosChange(photos.filter((p) => p.localId !== localId));
  };

  const handleAddClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="photo-upload">
      <label className="photo-upload-label">{label}</label>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        onChange={handleFileSelect}
        className="photo-input-hidden"
        capture="environment"
      />

      <div className="photos-grid">
        {photos.map((photo) => (
          <div key={photo.localId} className="photo-thumbnail">
            <img
              src={photo.previewUrl || URL.createObjectURL(photo.file)}
              alt="Preview"
              className="photo-thumbnail-image"
            />
            <button
              type="button"
              onClick={() => handleRemovePhoto(photo.localId)}
              className="photo-remove-button danger small"
              aria-label="Remove photo"
            >
              ×
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={handleAddClick}
          className="add-photo-button secondary"
        >
          <span className="add-photo-icon">📷</span>
          <span className="add-photo-text">إضافة صورة</span>
        </button>
      </div>

      {photos.length > 0 && (
        <div className="photo-count">
          {photos.length} {photos.length === 1 ? 'صورة' : 'صور'}
        </div>
      )}
    </div>
  );
}
