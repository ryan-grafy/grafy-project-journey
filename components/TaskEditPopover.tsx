import React, { useEffect, useState, useRef } from 'react';
import { Role, TaskEditPopoverState } from '../types';

interface TaskEditPopoverProps {
  state: TaskEditPopoverState;
  onClose: () => void;
  onSave: (taskId: string, role: Role, title: string, description: string, completed_date: string) => void;
  isAbsolute?: boolean;
}

const roleStyles: Record<Role, string> = {
  [Role.CLIENT]: 'bg-blue-100 text-blue-800 border-blue-200',
  [Role.PM]: 'bg-orange-100 text-orange-800 border-orange-200',
  [Role.DESIGNER]: 'bg-pink-100 text-pink-800 border-pink-200',
  [Role.MANAGER]: 'bg-green-100 text-green-800 border-green-200',
  [Role.ALL]: 'bg-slate-900 text-white border-slate-700',
};

const TaskEditPopover: React.FC<TaskEditPopoverProps> = ({ state, onClose, onSave, isAbsolute = false }) => {
  const [role, setRole] = useState<Role>(state.role);
  const [title, setTitle] = useState(state.title);
  const [description, setDescription] = useState(state.description);
  const [date, setDate] = useState(state.completed_date || '00-00-00');
  const popoverRef = useRef<HTMLDivElement>(null);
  
  const [position, setPosition] = useState({ top: state.y, left: state.x });

  // 팝업 외부 클릭 감지 리스너
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (state.isOpen && popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (state.isOpen) {
      // 이벤트 전파로 인해 즉시 닫히는 것을 방지하기 위해 setTimeout 사용
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [state.isOpen, onClose]);

  useEffect(() => {
    setRole(state.role);
    setTitle(state.title);
    setDescription(state.description);
    setDate(state.completed_date || '00-00-00');
    
    if (state.isOpen) {
        const width = 360; 
        const height = 520; 
        
        let nextLeft = state.x;
        let nextTop = state.y;

        const viewWidth = window.innerWidth;
        const viewHeight = window.innerHeight;
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;

        if (nextLeft + width > scrollX + viewWidth) {
          nextLeft = scrollX + viewWidth - width - 20;
        }
        if (nextTop + height > scrollY + viewHeight) {
          nextTop = scrollY + viewHeight - height - 20;
        }

        const minLeft = 20;
        const minTop = 20;

        setPosition({ 
          top: Math.max(minTop, nextTop), 
          left: Math.max(minLeft, nextLeft) 
        });
    }
  }, [state, isAbsolute]);

  if (!state.isOpen || !state.taskId) return null;

  const handleDateChange = (val: string) => {
    const cleaned = val.replace(/[^0-9]/g, '');
    if (cleaned.length === 6) {
      const formatted = `${cleaned.slice(0, 2)}-${cleaned.slice(2, 4)}-${cleaned.slice(4, 6)}`;
      setDate(formatted);
    } else {
      setDate(val);
    }
  };

  return (
    <div className={isAbsolute ? "absolute z-[110]" : "fixed inset-0 z-[110]"} onClick={onClose} style={isAbsolute ? { top: position.top, left: position.left } : {}}>
      {!isAbsolute && <div className="fixed inset-0" onClick={onClose}></div>}
      <div 
        ref={popoverRef}
        className={`${isAbsolute ? "" : "fixed"} bg-white rounded-[1.25rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] p-7 border border-slate-200 w-[360px] animate-in fade-in zoom-in-95 duration-200 pointer-events-auto`}
        style={isAbsolute ? {} : { top: position.top, left: position.left }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-[16px] font-black text-black uppercase tracking-tighter">Edit Task Info</h3>
          <button onClick={onClose} className="text-slate-300 hover:text-black transition-colors p-2"><i className="fa-solid fa-times text-lg"></i></button>
        </div>

        <div className="mb-5">
          <p className="text-[12px] font-black text-slate-400 mb-2 uppercase tracking-widest">Role</p>
          <div className="relative">
            <select value={role} onChange={(e) => setRole(e.target.value as Role)} className={`w-full border rounded-xl p-3.5 text-[14.5px] font-black outline-none transition-all appearance-none cursor-pointer ${roleStyles[role]}`}>
              <option value={Role.CLIENT} className="bg-white text-blue-800">Client</option>
              <option value={Role.PM} className="bg-white text-orange-800">PM</option>
              <option value={Role.DESIGNER} className="bg-white text-pink-800">Designer</option>
              <option value={Role.MANAGER} className="bg-white text-green-800">Manager</option>
            </select>
            <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[11px] opacity-30"></i>
          </div>
        </div>

        <div className="mb-5">
          <p className="text-[12px] font-black text-slate-400 mb-2 uppercase tracking-widest">Task Title</p>
          <input type="text" className="w-full border border-slate-100 rounded-xl p-3.5 text-[16px] font-bold text-black outline-none focus:border-black bg-white shadow-sm" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="태스크 제목" />
        </div>

        <div className="mb-5">
          <p className="text-[12px] font-black text-slate-400 mb-2 uppercase tracking-widest">Description</p>
          <textarea className="w-full border border-slate-100 rounded-xl p-3.5 text-[16px] font-bold text-black outline-none focus:border-black bg-white min-h-[100px] resize-none shadow-sm" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="태스크 상세 내용" />
        </div>

        <div className="mb-7">
          <p className="text-[12px] font-black text-slate-400 mb-2 uppercase tracking-widest">마감일 (YYMMDD 입력)</p>
          <input 
            type="text" 
            maxLength={8}
            className="w-full border border-slate-100 rounded-xl p-3.5 text-[16px] font-black text-black outline-none focus:border-black bg-white shadow-sm font-mono" 
            value={date} 
            placeholder="예: 250131"
            onChange={(e) => handleDateChange(e.target.value)} 
          />
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3.5 text-[15px] font-black text-slate-800 bg-slate-300 rounded-xl hover:bg-slate-400 transition-all">취소</button>
          <button onClick={() => { onSave(state.taskId!, role, title, description, date); }} className="flex-1 py-3.5 text-[15px] font-black bg-black text-white rounded-xl hover:bg-slate-800 transition-all shadow-lg active:scale-95">저장</button>
        </div>
      </div>
    </div>
  );
};

export default TaskEditPopover;
