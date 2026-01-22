import React, { useState, useEffect } from 'react';
import { Project } from '../types';

interface TemplateManagerModalProps {
  templates: Project[];
  onClose: () => void;
  onUpdate: (projectId: string, updates: Partial<Project>) => void;
  onDelete: (projectId: string) => void;
}

const TemplateManagerModal: React.FC<TemplateManagerModalProps> = ({ templates, onClose, onUpdate, onDelete }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  useEffect(() => {
    if (deletingId) {
      const timer = setTimeout(() => setDeletingId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [deletingId]);

  const handleStartEdit = (template: Project) => {
    setEditingId(template.id);
    setEditName(template.name);
  };

  const handleSaveEdit = (templateId: string) => {
    if (editName.trim()) {
      onUpdate(templateId, { name: editName.trim() });
      setEditingId(null);
      setEditName('');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleDeleteClick = (templateId: string) => {
    if (deletingId === templateId) {
      onDelete(templateId);
      setDeletingId(null);
    } else {
      setDeletingId(templateId);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-black">템플릿 관리</h2>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
            >
              <i className="fa-solid fa-xmark text-slate-600"></i>
            </button>
          </div>
          <p className="text-sm text-slate-500 mt-2">저장된 템플릿을 수정하거나 삭제할 수 있습니다.</p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <i className="fa-solid fa-inbox text-6xl text-slate-200 mb-4"></i>
              <p className="text-slate-400 font-bold">저장된 템플릿이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-4 hover:border-black transition-colors"
                >
                  {editingId === template.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(template.id);
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                        className="flex-1 px-3 py-2 border-2 border-black rounded-lg font-bold text-black outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveEdit(template.id)}
                        className="px-4 py-2 bg-black text-white rounded-lg font-bold hover:bg-slate-800 transition-colors"
                      >
                        저장
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-300 transition-colors"
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-black text-lg text-black">{template.name}</h3>
                        <p className="text-xs text-slate-500 mt-1">
                          생성일: {new Date(template.created_at).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleStartEdit(template)}
                          className="px-4 py-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 hover:border-black hover:text-black transition-all"
                        >
                          <i className="fa-solid fa-pen mr-2"></i>수정
                        </button>
                        <button
                          onClick={() => handleDeleteClick(template.id)}
                          className={`px-4 py-2 rounded-lg font-bold transition-all ${
                            deletingId === template.id
                              ? 'bg-red-500 text-white animate-pulse'
                              : 'bg-white border border-red-200 text-red-500 hover:bg-red-50'
                          }`}
                        >
                          <i className="fa-solid fa-trash mr-2"></i>
                          {deletingId === template.id ? '정말 삭제?' : '삭제'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-black text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateManagerModal;
