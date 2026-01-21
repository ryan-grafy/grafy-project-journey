
import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { STORAGE_BUCKET } from '../constants';

interface FileDropzoneProps {
  projectId: string;
  taskId: string;
  onToast: (msg: string) => void;
  isCompleted?: boolean;
  accentColor?: string;
  isLockedProject?: boolean;
}

interface FileMetadata {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
}

const FileDropzone: React.FC<FileDropzoneProps> = ({
  projectId, taskId, onToast, isCompleted = false, accentColor = 'bg-slate-600', isLockedProject = false
}) => {
  const [fileMeta, setFileMeta] = useState<FileMetadata | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchFileMetadata();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, taskId]);

  const fetchFileMetadata = async () => {
    if (!projectId || !taskId || !supabase) return;
    const { data } = await supabase.from('task_files')
      .select('*')
      .eq('project_id', projectId)
      .eq('task_id', taskId)
      .single();
    if (data) setFileMeta(data);
    else setFileMeta(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (isLockedProject) return;
    if (!fileMeta && !isUploading) setIsDragActive(true);
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
    if (fileMeta || isUploading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLockedProject) {
      onToast("이전 스텝 완료가 필요합니다.");
      return;
    }
    if (!fileMeta && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    if (!supabase || !projectId) {
      onToast("데이터베이스 연결 실패");
      return;
    }

    const maxSize = 30 * 1024 * 1024; // 30MB
    if (file.size > maxSize) {
      onToast("30MB 이하의 파일만 업로드 가능합니다.");
      return;
    }

    setIsUploading(true);
    try {
      // 1. Storage Upload
      const fileExt = file.name.split('.').pop();
      const fileName = `${taskId}_${Date.now()}.${fileExt}`;
      const filePath = `${projectId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. DB Insert
      const { data, error: dbError } = await supabase.from('task_files').insert({
        project_id: projectId,
        task_id: taskId,
        file_name: file.name,
        file_size: file.size,
        file_path: filePath
      }).select().single();

      if (dbError) throw dbError;

      setFileMeta(data);
      onToast("파일 업로드 완료");
    } catch (e: any) {
      console.error(e);
      let msg = "업로드 실패: " + (e.message || "알 수 없는 오류");
       if (e.message?.includes('Bucket not found') || e.message?.includes('not found')) {
          console.log("Bucket not found. Attempting to create...");
          const { error: createError } = await supabase.storage.createBucket(STORAGE_BUCKET, {
              public: true,
              fileSizeLimit: 52428800
          });
          if (!createError) {
              msg = "파일 저장소를 생성했습니다. 다시 업로드해주세요.";
          } else {
              msg = `업로드 실패: 저장소 생성 권한 오류. 대시보드에서 '${STORAGE_BUCKET}' 버킷을 만들어주세요.`;
          }
       }
      onToast(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!fileMeta || !supabase) return;

    onToast("다운로드 준비 중...");
    try {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .download(fileMeta.file_path);

      if (error) throw error;
      if (!data) return;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileMeta.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      onToast("다운로드 실패");
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLockedProject) {
      onToast("이전 스텝 완료가 필요합니다.");
      return;
    }
    // if (isCompleted) { // Removed upon user request
    //   onToast("수정할 수 없는 상태입니다.");
    //   return;
    // }
    if (!fileMeta || !supabase) return;

    if (!confirm("정말 파일을 삭제하시겠습니까?")) return;

    try {
      // 1. Storage Delete
      const { error: storageError } = await supabase.storage
        .from('project-files')
        .remove([fileMeta.file_path]);

      if (storageError) console.error("Storage delete fail", storageError);

      // 2. DB Delete
      const { error: dbError } = await supabase.from('task_files')
        .delete()
        .eq('id', fileMeta.id);

      if (dbError) throw dbError;

      setFileMeta(null);
      onToast("파일이 삭제되었습니다.");
    } catch (e) {
      console.error(e);
      onToast("삭제 실패");
    }
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
      style={isDragActive ? activeBgStyle : (!fileMeta ? dashedBgStyle : {})}
      className={`
        rounded-xl p-2 text-center text-[13px] 
        transition-all duration-200 min-h-[44px] flex flex-col justify-center items-center
        ${isDragActive ? 'bg-blue-50 text-blue-500' : 'bg-slate-100 text-slate-500 font-black'}
        ${fileMeta ? '!bg-white border-2 border-slate-300' : ''}
        ${isLockedProject && !fileMeta ? 'opacity-40 grayscale cursor-not-allowed' : ''}
      `}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
      />

      {isUploading ? (
        <div className="flex items-center gap-2 text-blue-500">
          <i className="fa-solid fa-spinner fa-spin"></i>
          <span>업로드 중...</span>
        </div>
      ) : !fileMeta ? (
        <div className="pointer-events-none flex items-center gap-2">
          <i className="fa-solid fa-cloud-arrow-up text-base opacity-70"></i>
          <span>파일 드래그 앤 드롭 ( 30MB 제한 )</span>
        </div>
      ) : (
        <div className="w-full">
          <div className="flex items-center justify-between w-full p-1 bg-white border border-slate-300 rounded-[0.8rem] gap-1">
            <span className="truncate pr-2 font-bold text-slate-900 text-[11px] text-left flex-1" title={fileMeta.file_name}>
              {fileMeta.file_name} <span className="text-[9px] text-slate-400">({Math.round(fileMeta.file_size / 1024)}KB)</span>
            </span>
            <button
              onClick={handleDownload}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isLockedProject) {
                  onToast("이전 스텝 완료가 필요합니다.");
                  return;
                }
                fileInputRef.current?.click();
              }}
              className={`flex-1 min-w-[50%] shrink-0 ${accentColor} text-white py-2 rounded-xl border border-transparent hover:brightness-90 transition-all text-[13px] font-black uppercase flex items-center justify-center gap-1.5 shadow-sm`}
              title="우클릭으로 파일 재업로드"
            >
              <i className="fa-solid fa-download text-[12px]"></i> 다운로드
            </button>
          </div>
          {(!isCompleted && !isLockedProject) && (
            <button
              onClick={handleDelete}
              className="text-[9.5px] text-slate-400 mt-1 hover:text-red-500 font-black transition-colors"
            >
              삭제하기
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default FileDropzone;
