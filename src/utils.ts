/**
 * Generate a unique ID for local use
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Debounce function for search
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function (this: any, ...args: Parameters<T>) {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      func.apply(this, args);
    }, wait);
  };
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  if (!url) return true; // Empty is valid (optional field)

  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create a preview URL for an image file
 */
export function createImagePreview(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Check if file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}
