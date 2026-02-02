// File validation utilities for secure uploads

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a file before upload
 * Checks file type (MIME type) and size limits
 */
export const validateImageFile = (file: File): FileValidationResult => {
  // Check file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as typeof ALLOWED_IMAGE_TYPES[number])) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: JPEG, PNG, GIF, WebP`,
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const maxSizeMB = MAX_FILE_SIZE / (1024 * 1024);
    return {
      valid: false,
      error: `File too large. Maximum size: ${maxSizeMB}MB`,
    };
  }

  return { valid: true };
};

/**
 * Validates multiple files before upload
 */
export const validateImageFiles = (files: FileList | File[]): FileValidationResult => {
  const fileArray = Array.from(files);
  
  for (const file of fileArray) {
    const result = validateImageFile(file);
    if (!result.valid) {
      return result;
    }
  }

  return { valid: true };
};
