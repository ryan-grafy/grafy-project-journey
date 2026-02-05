import React, { useState, useEffect } from 'react';
import { TeamMember } from '../types';
import { X, Plus, Trash2, User } from 'lucide-react';

interface TeamManagementModalProps {
  members: TeamMember[];
  onClose: () => void;
  onUpdate: (newMembers: TeamMember[]) => void;
}

const TeamManagementModal: React.FC<TeamManagementModalProps> = ({ members, onClose, onUpdate }) => {
  const [editMembers, setEditMembers] = useState<TeamMember[]>([...members]);

  // No scroll lock to prevent scrollbar shifting/shaking
  useEffect(() => {
    // Esc key to close
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

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
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* 
         Backdrop: Removed bg-black/20 and backdrop-blur per request.
         Kept for click-to-close functionality.
      */}
      <div className="absolute inset-0" onClick={onClose} />
      
      {/* 
         Modal Container:
         - bg-white/20: Brighter
         - backdrop-blur-[35px]
         - shadow: Enhanced for better separation without backdrop tint
      */}
      <div className="relative bg-white/20 backdrop-blur-[35px] rounded-[2.5rem] w-[1000px] max-h-[85vh] flex flex-col p-10 shadow-[0_30px_100px_-15px_rgba(0,0,0,0.25)] border border-white/50 ring-1 ring-white/20">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8 pl-2">
          <div className="flex flex-col">
            <h2 
              className="text-3xl font-bold tracking-tight text-black"
              style={{ fontFamily: "'Helvetica Now Display', 'Helvetica Neue', Helvetica, Arial, sans-serif" }}
            >
              Team Management
            </h2>
            <p className="text-black/50 text-sm font-medium mt-1 ml-0.5">Manage your project members</p>
          </div>
          <button 
            onClick={onClose} 
            className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-white/30 transition-all text-black/70 hover:text-black border border-transparent hover:border-white/20"
          >
            <X size={24} strokeWidth={2.5} />
          </button>
        </div>

        {/* Scoped Scrollbar Style */}
        <style>{`
          .custom-scrollbar-black::-webkit-scrollbar {
            width: 8px;
          }
          .custom-scrollbar-black::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.05);
            border-radius: 4px;
          }
          .custom-scrollbar-black::-webkit-scrollbar-thumb {
            background: rgba(0, 0, 0, 0.2);
            border-radius: 4px;
          }
          .custom-scrollbar-black::-webkit-scrollbar-thumb:hover {
            background: rgba(0, 0, 0, 0.4);
          }
        `}</style>

        {/* List Header (Fixed) */}
        <div className="grid grid-cols-12 gap-4 mb-3 px-4 text-[13px] font-semibold text-black/50 uppercase tracking-widest flex-shrink-0">
          <div className="col-span-1 pl-2">No.</div>
          <div className="col-span-2 pl-2">Name</div>
          <div className="col-span-2 pl-2">Position</div>
          <div className="col-span-3 pl-2">Contact</div>
          <div className="col-span-3 pl-2">Email</div>
          <div className="col-span-1"></div>
        </div>

        {/* Scrollable List Area */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar-black mb-4 -mr-2">
          <div className="flex flex-col gap-3 pb-2 pt-1 px-1">
            {editMembers.map((m, index) => (
              <div 
                key={m.id} 
                className="grid grid-cols-12 gap-4 items-center bg-white/35 hover:bg-white/55 p-3 rounded-2xl border border-white/30 transition-all group shadow-sm"
              >
                {/* Index Number */}
                <div className="col-span-1 pl-2 font-medium text-black/40 text-sm">
                  {String(index + 1).padStart(2, '0')}
                </div>

                <input 
                  className="col-span-2 bg-transparent border-b border-transparent focus:border-black/20 p-2 text-[16px] font-medium placeholder-black/30 outline-none text-black transition-colors"
                  placeholder="Name"
                  value={m.name}
                  onChange={(e) => handleChange(m.id, 'name', e.target.value)}
                  style={{ fontFamily: "'Helvetica Now Display', 'Helvetica Neue', sans-serif" }}
                />
                <input 
                  className="col-span-2 bg-transparent border-b border-transparent focus:border-black/20 p-2 text-[16px] font-normal placeholder-black/30 outline-none text-black/80 transition-colors"
                  placeholder="Position"
                  value={m.title}
                  onChange={(e) => handleChange(m.id, 'title', e.target.value)}
                  style={{ fontFamily: "'Helvetica Now Display', 'Helvetica Neue', sans-serif" }}
                />
                <input 
                  className="col-span-3 bg-transparent border-b border-transparent focus:border-black/20 p-2 text-[16px] font-normal placeholder-black/30 outline-none text-black/80 transition-colors tracking-tight"
                  placeholder="Contact"
                  value={m.phone}
                  onChange={(e) => handleChange(m.id, 'phone', e.target.value)}
                  style={{ fontFamily: "'Helvetica Now Display', 'Helvetica Neue', sans-serif" }}
                />
                <input 
                  className="col-span-3 bg-transparent border-b border-transparent focus:border-black/20 p-2 text-[16px] font-normal placeholder-black/30 outline-none text-black/80 transition-colors tracking-tight"
                  placeholder="Email Address"
                  value={m.email}
                  onChange={(e) => handleChange(m.id, 'email', e.target.value)}
                  style={{ fontFamily: "'Helvetica Now Display', 'Helvetica Neue', sans-serif" }}
                />
                <div className="col-span-1 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleRemove(m.id)}
                    className="p-2 text-black/30 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add Member Button (Fixed) */}
        <button 
          onClick={handleAdd}
          className="w-full mb-2 py-5 border border-black/10 hover:border-black/20 rounded-[2rem] bg-white/30 text-black font-semibold hover:bg-white/45 transition-all flex items-center justify-center gap-3 group relative overflow-hidden shadow-sm shadow-black/5 flex-shrink-0"
        >
          <div className="relative w-7 h-7 flex items-center justify-center">
            {/* Plus icon fades/scales out */}
            <div className="transition-all duration-300 group-hover:scale-0 group-hover:opacity-0 bg-black/5 rounded-full p-1.5 flex items-center justify-center">
              <Plus size={14} strokeWidth={3} />
            </div>
            {/* User icon pops up from bottom frame */}
            <div className="absolute inset-0 flex items-center justify-center transition-all duration-300 translate-y-8 opacity-0 group-hover:translate-y-0 group-hover:opacity-100">
              <User size={18} className="text-black" strokeWidth={2.5} />
            </div>
          </div>
          <span style={{ fontFamily: "'Helvetica Now Display', 'Helvetica Neue', sans-serif" }}>Add New Member</span>
        </button>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-2 pt-6 border-t border-white/20">
          <button 
            onClick={onClose} 
            className="px-8 py-4 text-[15px] font-medium text-black/70 bg-white/20 hover:bg-white/40 border border-white/30 rounded-[20px] transition-all backdrop-blur-md"
            style={{ fontFamily: "'Helvetica Now Display', 'Helvetica Neue', sans-serif" }}
          >
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            className="px-10 py-4 text-[15px] font-bold text-black bg-white hover:bg-white/90 rounded-[20px] shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
            style={{ fontFamily: "'Helvetica Now Display', 'Helvetica Neue', sans-serif" }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeamManagementModal;
