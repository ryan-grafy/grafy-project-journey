import React, { useState } from 'react';

interface TemplateSaveModalProps {
  onClose: () => void;
  onSave: (name: string) => void;
}

const TemplateSaveModal: React.FC<TemplateSaveModalProps> = ({ onClose, onSave }) => {
  const [name, setName] = useState('');

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-[400px] shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-black mb-4">템플릿 저장</h3>
        <p className="text-sm text-slate-500 mb-4 font-bold">현재 프로젝트 상태를 템플릿으로 저장합니다.</p>
        <input 
          autoFocus
          className="w-full border-2 border-slate-200 rounded-xl p-3 font-bold mb-4 focus:border-black outline-none transition-colors"
          placeholder="템플릿 이름을 입력하세요"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && name && onSave(name)}
        />
        <div className="flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">취소</button>
            <button 
                onClick={() => name && onSave(name)} 
                disabled={!name}
                className="px-6 py-3 rounded-xl bg-black text-white font-bold hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-lg shadow-black/20"
            >
                저장하기
            </button>
        </div>
      </div>
    </div>
  );
};
export default TemplateSaveModal;
