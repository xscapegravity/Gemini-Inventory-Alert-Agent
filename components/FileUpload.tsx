import React, { useCallback } from 'react';
import { UploadCloud } from 'lucide-react';
import * as XLSX from 'xlsx'; // Import for type reference if needed, but we use logic in utils

interface FileUploadProps {
  onFileUpload: (file: File) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload }) => {
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        onFileUpload(files[0]);
      }
    },
    [onFileUpload]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileUpload(files[0]);
    }
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer bg-white shadow-sm"
    >
      <input
        type="file"
        accept=".xlsx, .xls, .csv"
        onChange={handleChange}
        className="hidden"
        id="file-upload"
      />
      <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
        <div className="bg-blue-100 p-4 rounded-full mb-4">
          <UploadCloud className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">
          Upload Inventory File
        </h3>
        <p className="text-gray-500 max-w-sm mx-auto">
          Drag and drop your Excel or CSV file here, or click to browse.
          Expected columns: SKU, DC, MOH, Accuracy, On Hand, 3m Actuals.
        </p>
      </label>
    </div>
  );
};
