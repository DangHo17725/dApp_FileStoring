import { useCallback, useState } from 'react';
import { Upload, File, X, Check } from 'lucide-react';
import { formatFileSize } from '../../utils/format';
import { isValidFileType } from '../../utils/hash';

export function FileUpload({ onFileSelect, onFileRemove, file, documentHash, isHashing }) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && isValidFileType(droppedFile)) {
      onFileSelect(droppedFile);
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      onFileSelect(selectedFile);
    }
  }, [onFileSelect]);

  if (file) {
    return (
      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
              <File className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-dark-200">{file.name}</p>
              <p className="text-xs text-dark-500">{formatFileSize(file.size)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isHashing && (
              <span className="text-xs text-amber-400">Hashing...</span>
            )}
            {documentHash && (
              <Check className="w-5 h-5 text-emerald-400" />
            )}
            <button
              onClick={onFileRemove}
              className="p-1.5 hover:bg-dark-700 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-dark-400" />
            </button>
          </div>
        </div>
        {documentHash && (
          <div className="mt-3 pt-3 border-t border-dark-700">
            <p className="text-xs text-dark-500 mb-1">Document Hash (SHA-256)</p>
            <p className="font-mono text-xs text-primary-400 break-all">{documentHash}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
        isDragging
          ? 'border-primary-500 bg-primary-500/10'
          : 'border-dark-700 hover:border-dark-600'
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        onChange={handleFileInput}
        className="hidden"
        id="file-upload"
      />
      <label
        htmlFor="file-upload"
        className="cursor-pointer flex flex-col items-center gap-3"
      >
        <div className="w-12 h-12 bg-dark-800 rounded-xl flex items-center justify-center">
          <Upload className="w-6 h-6 text-dark-400" />
        </div>
        <div>
          <p className="text-dark-200 font-medium">
            Drop your certificate file here, or{' '}
            <span className="text-primary-400">browse</span>
          </p>
          <p className="text-xs text-dark-500 mt-1">Supports PDF, PNG, JPG (max 10MB)</p>
        </div>
      </label>
    </div>
  );
}
