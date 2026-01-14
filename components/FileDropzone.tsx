
import React, { useState, useRef } from 'react';

interface FileDropzoneProps {
  onToast: (msg: string) => void;
  isCompleted?: boolean;
  accentColor?: string;
  isLockedProject?: boolean;
}

const FileDropzone: React.FC<FileDropzoneProps> = ({ onToast, isCompleted = false, accentColor = 'bg-slate-600', isLockedProject = false }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (isLockedProject) return;
    if (!file && !isCompleted) setIsDragActive(true);
  };

  const handleDragLeave = () => {
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (isLockedProject) {
        onToast("이전 스텝 완료가 필요합니다.");
        return;
    }
    if (file || isCompleted) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (isLockedProject) {
        onToast("이전 스텝 완료가 필요합니다.");
        return;
    }
    if (!file && !isCompleted) {
      fileInputRef.current?.click();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (uploadedFile: File) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (uploadedFile.size > maxSize) {
      onToast("10MB 이하의 파일만 업로드 가능합니다.");
      return;
    }
    setFile(uploadedFile);
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!file) return;
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onToast("파일 다운로드를 시작합니다.");
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLockedProject) {
        onToast("이전 스텝 완료가 필요합니다.");
        return;
    }
    if (isCompleted) {
        onToast("수정할 수 없는 상태입니다.");
        return;
    }
    setFile(null);
  };

  const dashedBgStyle = {
    backgroundImage: `url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' rx='12' ry='12' stroke='%23cbd5e1' stroke-width='2' stroke-dasharray='3%2c 3' stroke-dashoffset='0' stroke-linecap='square'/%3e%3c/svg%3e")`,
  };

  const activeBgStyle = {
    backgroundImage: `url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' rx='12' ry='12' stroke='%233b82f6' stroke-width='2' stroke-dasharray='3%2c 3' stroke-dashoffset='0' stroke-linecap='square'/%3e%3c/svg%3e")`,
  };

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={isDragActive ? activeBgStyle : (!file ? dashedBgStyle : {})}
      className={`
        rounded-xl p-2 text-center text-[13px] 
        transition-all duration-200 min-h-[44px] flex flex-col justify-center items-center
        ${isDragActive ? 'bg-blue-50 text-blue-500' : 'bg-slate-100 text-slate-500 font-black'}
        ${file ? '!bg-white border-2 border-slate-300' : ''}
        ${(isCompleted || isLockedProject) && !file ? 'opacity-40 grayscale cursor-not-allowed' : ''}
      `}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileSelect} 
        className="hidden" 
      />
      
      {!file ? (
        <div className="pointer-events-none flex items-center gap-2">
          <i className="fa-solid fa-cloud-arrow-up text-base opacity-70"></i>
          <span>파일 드래그 앤 드롭</span>
        </div>
      ) : (
        <div className="w-full">
          <div className="flex items-center justify-between w-full p-1 bg-white border border-slate-300 rounded-[0.8rem] gap-1">
            <span className="truncate pr-2 font-bold text-slate-900 text-[11px] text-left flex-1">{file.name}</span>
            <button
              onClick={handleDownload}
              className={`flex-1 min-w-[50%] shrink-0 ${accentColor} text-white py-2 rounded-xl border border-transparent hover:brightness-90 transition-all text-[13px] font-black uppercase flex items-center justify-center gap-1.5 shadow-sm`}
            >
              <i className="fa-solid fa-download text-[12px]"></i> 다운로드
            </button>
          </div>
          {(!isCompleted && !isLockedProject) && (
            <button
              onClick={handleReset}
              className="text-[9.5px] text-slate-400 mt-1 hover:text-black font-black"
            >
              다시 업로드
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default FileDropzone;
