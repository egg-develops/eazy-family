import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface ImagePreview {
  file: File;
  preview: string;
  size: number;
}

interface MarketplaceImageUploadProps {
  maxImages?: number;
  maxSizePerImageMB?: number;
  onImagesSelected?: (files: File[]) => void;
  onError?: (error: string) => void;
}

const MarketplaceImageUpload: React.FC<MarketplaceImageUploadProps> = ({
  maxImages = 5,
  maxSizePerImageMB = 5,
  onImagesSelected,
  onError,
}) => {
  const [images, setImages] = useState<ImagePreview[]>([]);
  const [error, setError] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxSizeBytes = maxSizePerImageMB * 1024 * 1024;

  const validateAndAddImages = (files: FileList | null) => {
    if (!files) return;

    setError('');
    const newImages: ImagePreview[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!file.type.startsWith('image/')) {
        setError('Only image files are allowed');
        onError?.('Only image files are allowed');
        continue;
      }

      if (file.size > maxSizeBytes) {
        setError(
          `Image "${file.name}" exceeds ${maxSizePerImageMB}MB limit`
        );
        onError?.(`Image "${file.name}" exceeds ${maxSizePerImageMB}MB limit`);
        continue;
      }

      if (images.length + newImages.length >= maxImages) {
        setError(`Maximum ${maxImages} images allowed`);
        onError?.(`Maximum ${maxImages} images allowed`);
        break;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        if (typeof e.target?.result === 'string') {
          const preview: ImagePreview = {
            file,
            preview: e.target.result,
            size: file.size,
          };
          setImages((prev) => [...prev, preview]);
        }
      };
      reader.readAsDataURL(file);
      newImages.push({
        file,
        preview: '',
        size: file.size,
      });
    }

    onImagesSelected?.(newImages.map((img) => img.file));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    validateAndAddImages(e.target.files);
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    validateAndAddImages(e.dataTransfer.files);
  };

  const removeImage = (index: number) => {
    const updatedImages = images.filter((_, i) => i !== index);
    setImages(updatedImages);
    onImagesSelected?.(updatedImages.map((img) => img.file));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-2">Upload Images</h2>
      <p className="text-gray-600 mb-6">
        Upload up to {maxImages} images (max {maxSizePerImageMB}MB each)
      </p>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition cursor-pointer ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        <Upload size={40} className="mx-auto text-gray-400 mb-3" />
        <h3 className="text-lg font-semibold mb-2">
          Click to upload or drag and drop
        </h3>
        <p className="text-gray-600 text-sm mb-4">
          PNG, JPG, GIF up to {maxSizePerImageMB}MB
        </p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-semibold"
        >
          Select Images
        </button>
      </div>

      {images.length > 0 && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg">
              Selected Images ({images.length}/{maxImages})
            </h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {images.map((image, index) => (
              <div
                key={index}
                className="relative group rounded-lg overflow-hidden"
              >
                <img
                  src={image.preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-32 object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="absolute bottom-2 left-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded truncate">
                  {image.file.name}
                </div>

                <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs font-semibold px-2 py-1 rounded">
                  {index + 1}
                </div>

                <div className="absolute top-2 right-2 bg-gray-700 text-white text-xs px-2 py-1 rounded">
                  {formatFileSize(image.size)}
                </div>
              </div>
            ))}

            {images.length < maxImages && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 transition flex flex-col items-center justify-center cursor-pointer group"
              >
                <ImageIcon
                  size={32}
                  className="text-gray-400 group-hover:text-blue-500 mb-2"
                />
                <span className="text-sm text-gray-600">Add More</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketplaceImageUpload;
