import React, { useState } from 'react';

export const ImageUpload: React.FC<{ maxImages?: number; maxSizeMB?: number; onImagesSelected?: (files: File[]) => void }> = ({ maxImages = 5, maxSizeMB = 5, onImagesSelected }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newErrors: string[] = [];
    const validFiles: File[] = [];
    const newPreviews: string[] = [...previews];

    files.forEach(file => {
      if (selectedFiles.length + validFiles.length >= maxImages) {
        newErrors.push(`Maximum ${maxImages} images allowed`);
        return;
      }
      if (file.size > maxSizeBytes) {
        newErrors.push(`${file.name} exceeds ${maxSizeMB}MB limit`);
        return;
      }
      if (!file.type.startsWith('image/')) {
        newErrors.push(`${file.name} is not an image file`);
        return;
      }
      validFiles.push(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === 'string') {
          newPreviews.push(event.target.result);
          if (newPreviews.length === validFiles.length) setPreviews([...previews, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });

    setSelectedFiles([...selectedFiles, ...validFiles]);
    setErrors(newErrors);
    onImagesSelected?.([...selectedFiles, ...validFiles]);
  };

  const removeImage = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    setPreviews(newPreviews);
    onImagesSelected?.(newFiles);
  };

  return (
    <div style={{ padding: '1rem', maxWidth: '600px' }}>
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Upload Images ({selectedFiles.length}/{maxImages})</label>
        <p style={{ fontSize: '0.9rem', color: '#666', margin: '0 0 1rem 0' }}>Max {maxImages} images, {maxSizeMB}MB each</p>
        <label style={{ display: 'block', border: '2px dashed #ccc', borderRadius: '8px', padding: '2rem', textAlign: 'center', cursor: 'pointer', backgroundColor: '#fafafa' }}>
          <input type="file" multiple accept="image/*" onChange={handleFileSelect} disabled={selectedFiles.length >= maxImages} style={{ display: 'none' }} />
          <div>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📸</div>
            <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Click to upload or drag</div>
            <div style={{ fontSize: '0.85rem', color: '#999' }}>PNG, JPG, GIF up to {maxSizeMB}MB</div>
          </div>
        </label>
      </div>
      {errors.length > 0 && <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#ffe6e6', borderRadius: '4px', color: '#d00' }}>{errors.map((error, i) => <div key={i} style={{ fontSize: '0.9rem' }}>⚠️ {error}</div>)}</div>}
      {previews.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Preview ({previews.length})</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.5rem' }}>
            {previews.map((preview, index) => (
              <div key={index} style={{ position: 'relative', paddingBottom: '100%', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                <img src={preview} alt={`Preview ${index + 1}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                <button onClick={() => removeImage(index)} style={{ position: 'absolute', top: '4px', right: '4px', width: '24px', height: '24px', backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', cursor: 'pointer', fontSize: '0.9rem', lineHeight: '24px', padding: 0 }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
