import React, { useLayoutEffect, useState, useRef } from 'react';
import { Role, TaskEditPopoverState } from '../types';

interface TaskEditPopoverProps {
  state: TaskEditPopoverState;
  onClose: () => void;
  onSave: (taskId: string, roles: Role[], title: string, description: string, completed_date: string) => void;
  isAbsolute?: boolean;
}

const roleStyles: Record<Role, string> = {
  [Role.CLIENT]: 'bg-blue-100 text-blue-800 border-blue-200',
  [Role.PM]: 'bg-orange-100 text-orange-800 border-orange-200',
  [Role.DESIGNER]: 'bg-pink-100 text-pink-800 border-pink-200',
  [Role.MANAGER]: 'bg-green-100 text-green-800 border-green-200',
  [Role.DEVELOPER]: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  [Role.ALL]: 'bg-slate-900 text-white border-slate-700',
};

const TaskEditPopover: React.FC<TaskEditPopoverProps> = ({ state, onClose, onSave, isAbsolute = false }) => {
  const [roles, setRoles] = useState<Role[]>(state.roles || [Role.PM]);
  const [title, setTitle] = useState(state.title);
  const [description, setDescription] = useState(state.description);
  const [date, setDate] = useState(state.completed_date || '00-00-00');
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  
  const popoverRef = useRef<HTMLDivElement>(null);
  const roleDropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isVisible, setIsVisible] = useState(false);

  // 팝업 외부 클릭 감지 리스너
  useLayoutEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // 롤 드롭다운이 열려있으면 닫기
      if (isRoleDropdownOpen && roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
        setIsRoleDropdownOpen(false);
        return;
      }
      
      if (state.isOpen && popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (state.isOpen) {
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [state.isOpen, onClose, isRoleDropdownOpen]);

  useLayoutEffect(() => {
    if (state.isOpen) {
      setRoles(state.roles || [Role.PM]);
      setTitle(state.title);
      setDescription(state.description);
      setDate(state.completed_date || '00-00-00');
    }
  }, [state.isOpen, state.roles, state.title, state.description, state.completed_date]);

  useLayoutEffect(() => {
    if (state.isOpen && popoverRef.current) {
        const { offsetWidth: width, offsetHeight: height } = popoverRef.current;

        const viewWidth = window.innerWidth;
        const viewHeight = window.innerHeight;
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;

        const margin = 20;

        // X: Start slightly right of cursor
        let nextLeft = state.x + 10;
        
        // Y: Center popup vertically on the cursor position
        let nextTop = state.y - (height / 2);

        // --- Horizontal Constraint ---
        // If it goes off right edge, flip to left of cursor
        if (nextLeft + width > scrollX + viewWidth - margin) {
            nextLeft = state.x - width - 10;
        }
        // If it goes off left edge after flip, clamp to left margin
        if (nextLeft < scrollX + margin) {
            nextLeft = scrollX + margin;
        }

        // --- Vertical Constraint (Clamping) ---
        // Clamp top
        if (nextTop < scrollY + margin) {
            nextTop = scrollY + margin;
        }
        // Clamp bottom
        if (nextTop + height > scrollY + viewHeight - margin) {
            nextTop = scrollY + viewHeight - height - margin;
        }

        setPosition({ 
          top: nextTop, 
          left: nextLeft 
        });
        setIsVisible(true);
    } else {
        setIsVisible(false);
    }
  }, [state.isOpen, state.x, state.y]);

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

  const toggleRole = (roleToToggle: Role) => {
    setRoles(prev => {
      if (prev.includes(roleToToggle)) {
        const next = prev.filter(r => r !== roleToToggle);
        return next.length > 0 ? next : [Role.PM]; // 최소 1개 유지
      } else {
        return [...prev, roleToToggle];
      }
    });
  };

  const availableRoles = [Role.CLIENT, Role.PM, Role.DESIGNER, Role.MANAGER];

  return (
    <div className="absolute z-[110]" style={{ top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      <div className="fixed inset-0 pointer-events-auto" onClick={onClose}></div>
      <div 
        ref={popoverRef}
        className={`absolute bg-white rounded-[1.25rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] p-7 border border-slate-200 w-[360px] pointer-events-auto transition-opacity duration-150 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        style={{ top: position.top, left: position.left }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-[16px] font-black text-black uppercase tracking-tighter">Edit Task Info</h3>
          <button onClick={onClose} className="text-slate-300 hover:text-black transition-colors p-2"><i className="fa-solid fa-times text-lg"></i></button>
        </div>

        <div className="mb-5">
          <p className="text-[12px] font-black text-slate-400 mb-2 uppercase tracking-widest">Role</p>
          <div className="relative" ref={roleDropdownRef}>
            <div 
              onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
              className="w-full border rounded-xl p-3 min-h-[50px] cursor-pointer bg-white hover:border-black/30 transition-colors flex flex-wrap gap-2 items-center"
            >
              {roles.map(r => (
                <span key={r} className={`text-[11px] font-black px-2 py-1 rounded-lg uppercase tracking-wider ${roleStyles[r]}`}>
                  {r}
                </span>
              ))}
              <div className="ml-auto">
                <i className={`fa-solid fa-chevron-down text-[11px] text-slate-400 transition-transform ${isRoleDropdownOpen ? 'rotate-180' : ''}`}></i>
              </div>
            </div>

            {isRoleDropdownOpen && (
              <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-100">
                {availableRoles.map(r => (
                  <div 
                    key={r}
                    onClick={() => toggleRole(r)}
                    className={`px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors ${roles.includes(r) ? 'bg-blue-50/50' : ''}`}
                  >
                    <span className={`text-[12px] font-bold ${roles.includes(r) ? 'text-black' : 'text-slate-500'}`}>{r.toUpperCase()}</span>
                    {roles.includes(r) && <i className="fa-solid fa-check text-blue-500 text-sm"></i>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mb-5">
          <p className="text-[12px] font-black text-slate-400 mb-2 uppercase tracking-widest">Task Title</p>
          <input type="text" className="w-full border border-slate-100 rounded-xl p-3.5 text-[16px] font-bold text-black outline-none focus:border-black bg-white shadow-sm" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="태스크 제목" />
        </div>

        <div className="mb-5">
          <p className="text-[12px] font-black text-slate-400 mb-2 uppercase tracking-widest">Description</p>
          <textarea className="w-full border border-slate-100 rounded-xl p-3.5 text-[16px] font-bold text-black outline-none focus:border-black bg-white min-h-[100px] resize-none shadow-sm break-all" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="태스크 상세 내용" />
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
          <button onClick={() => { onSave(state.taskId!, roles, title, description, date); }} className="flex-1 py-3.5 text-[15px] font-black bg-black text-white rounded-xl hover:bg-slate-800 transition-all shadow-lg active:scale-95">저장</button>
        </div>
      </div>
    </div>
  );
};

export default TaskEditPopover;
