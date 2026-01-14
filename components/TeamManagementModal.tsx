
import React, { useState } from 'react';
import { TeamMember } from '../types';

interface TeamManagementModalProps {
  members: TeamMember[];
  onClose: () => void;
  onUpdate: (newMembers: TeamMember[]) => void;
}

const TeamManagementModal: React.FC<TeamManagementModalProps> = ({ members, onClose, onUpdate }) => {
  const [editMembers, setEditMembers] = useState<TeamMember[]>([...members]);

  const handleAdd = () => {
    const newMember: TeamMember = {
      id: `team-${Date.now()}`,
      name: '',
      title: '',
      phone: '',
      email: ''
    };
    setEditMembers([...editMembers, newMember]);
  };

  const handleRemove = (id: string) => {
    setEditMembers(editMembers.filter(m => m.id !== id));
  };

  const handleChange = (id: string, field: keyof TeamMember, value: string) => {
    setEditMembers(editMembers.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const handleSave = () => {
    onUpdate(editMembers);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] animate-in fade-in duration-200">
      <div className="bg-white rounded-[1.25rem] w-[800px] max-h-[80vh] flex flex-col p-10 shadow-2xl border border-slate-200">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black tracking-tighter text-black uppercase">TEAM MANAGEMENT</h2>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 transition-all text-black">
            <i className="fa-solid fa-times text-xl"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar mb-8">
          <div className="grid grid-cols-12 gap-4 mb-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <div className="col-span-2">이름</div>
            <div className="col-span-2">직함</div>
            <div className="col-span-3">연락처</div>
            <div className="col-span-4">이메일</div>
            <div className="col-span-1"></div>
          </div>

          <div className="flex flex-col gap-3">
            {editMembers.map((m) => (
              <div key={m.id} className="grid grid-cols-12 gap-4 items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                <input 
                  className="col-span-2 bg-white border border-slate-200 rounded-lg p-2 text-sm font-bold outline-none focus:border-black text-black"
                  placeholder="이름"
                  value={m.name}
                  onChange={(e) => handleChange(m.id, 'name', e.target.value)}
                />
                <input 
                  className="col-span-2 bg-white border border-slate-200 rounded-lg p-2 text-sm font-bold outline-none focus:border-black text-black"
                  placeholder="직함"
                  value={m.title}
                  onChange={(e) => handleChange(m.id, 'title', e.target.value)}
                />
                <input 
                  className="col-span-3 bg-white border border-slate-200 rounded-lg p-2 text-sm font-bold outline-none focus:border-black text-black"
                  placeholder="010-0000-0000"
                  value={m.phone}
                  onChange={(e) => handleChange(m.id, 'phone', e.target.value)}
                />
                <input 
                  className="col-span-4 bg-white border border-slate-200 rounded-lg p-2 text-sm font-bold outline-none focus:border-black text-black"
                  placeholder="email@example.com"
                  value={m.email}
                  onChange={(e) => handleChange(m.id, 'email', e.target.value)}
                />
                <button 
                  onClick={() => handleRemove(m.id)}
                  className="col-span-1 text-red-400 hover:text-red-600 transition-colors"
                >
                  <i className="fa-solid fa-minus-circle text-xl"></i>
                </button>
              </div>
            ))}
          </div>

          <button 
            onClick={handleAdd}
            className="w-full mt-4 py-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 font-black hover:border-black hover:text-black transition-all flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-plus"></i> 멤버 추가
          </button>
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-8 py-4 text-sm font-bold text-slate-500 bg-slate-100 rounded-xl">취소</button>
          <button onClick={handleSave} className="px-10 py-4 text-sm font-black text-white bg-black rounded-xl shadow-xl shadow-black/20">명단 저장</button>
        </div>
      </div>
    </div>
  );
};

export default TeamManagementModal;
