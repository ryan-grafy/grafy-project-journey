import React, { useState } from 'react';
import { Project } from '../types';

interface DeletedDataModalProps {
  onClose: () => void;
  onRestore: (projectId: string) => void;
  deletedProjects: Project[];
}

const DeletedDataModal: React.FC<DeletedDataModalProps> = ({ onClose, onRestore, deletedProjects }) => {
  const [restoring, setRestoring] = useState<string | null>(null);

  const handleRestore = async (projectId: string) => {
    setRestoring(projectId);
    await onRestore(projectId);
    setRestoring(null);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]" onClick={onClose}>
      <div className="bg-white rounded-[1rem] w-[90%] max-w-[800px] max-h-[80vh] p-6 md:p-10 shadow-2xl border border-slate-100 flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-[20px] md:text-[25px] font-black tracking-tighter text-black uppercase">삭제 데이터 관리</h2>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-black">
            <i className="fa-solid fa-times text-xl"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {deletedProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <i className="fa-solid fa-inbox text-5xl text-slate-300 mb-4"></i>
              <p className="text-lg font-bold text-slate-400">삭제된 프로젝트가 없습니다</p>
              <p className="text-sm text-slate-300 mt-2">삭제된 프로젝트가 여기에 표시됩니다</p>
            </div>
          ) : (
            <div className="space-y-3">
              {deletedProjects.map((project) => (
                <div key={project.id} className="border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base md:text-lg font-black text-black truncate mb-1">{project.name}</h3>
                      <p className="text-xs md:text-sm text-slate-500 font-bold">
                        {project.pm_name && `PM: ${project.pm_name}`}
                        {project.designer_name && ` · Designer: ${project.designer_name}`}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        시작일: {project.start_date || '-'} · 종료일: {project.end_date || '-'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRestore(project.id)}
                      disabled={restoring === project.id}
                      className="shrink-0 px-4 py-2 bg-emerald-500 text-white text-sm font-bold rounded-lg hover:bg-emerald-600 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {restoring === project.id ? (
                        <>
                          <i className="fa-solid fa-spinner fa-spin"></i>
                          <span className="hidden md:inline">복구 중...</span>
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-trash-arrow-up"></i>
                          <span className="hidden md:inline">복구</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end mt-6 pt-4 border-t border-slate-100">
          <button onClick={onClose} className="px-8 py-3 text-base font-bold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all">
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeletedDataModal;
