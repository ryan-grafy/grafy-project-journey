import React, { useEffect, useRef, useState } from 'react';
import { PopoverState } from '../types';

interface UrlPopoverProps {
  popoverState: PopoverState;
  onClose: () => void;
  onSave: (taskId: string, url: string, label: string) => void;
  isAbsolute?: boolean;
}

const UrlPopover: React.FC<UrlPopoverProps> = ({ popoverState, onClose, onSave, isAbsolute = false }) => {
  const [url, setUrl] = useState(popoverState.currentUrl);
  const [label, setLabel] = useState(popoverState.currentLabel);
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: popoverState.y, left: popoverState.x });

  // 팝업 외부 클릭 감지 리스너
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverState.isOpen && popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (popoverState.isOpen) {
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [popoverState.isOpen, onClose]);

  useEffect(() => {
    setUrl(popoverState.currentUrl);
    setLabel(popoverState.currentLabel);
    
    if (popoverState.isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);

      const width = 300;
      const height = 350;
      let nextLeft = popoverState.x;
      let nextTop = popoverState.y;

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

      setPosition({ 
        top: Math.max(20, nextTop), 
        left: Math.max(20, nextLeft) 
      });
    }
  }, [popoverState, isAbsolute]);

  if (!popoverState.isOpen || !popoverState.taskId) return null;

  const handleSave = () => {
    let finalUrl = url.trim();
    if (finalUrl && !finalUrl.startsWith('http')) {
      finalUrl = 'https://' + finalUrl;
    }
    onSave(popoverState.taskId!, finalUrl, label.trim());
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') onClose();
  };

  return (
    <div className={isAbsolute ? "absolute z-[110]" : "fixed inset-0 z-[110]"} onClick={onClose} style={isAbsolute ? { top: position.top, left: position.left } : {}}>
      {!isAbsolute && <div className="fixed inset-0" onClick={onClose}></div>}
      <div 
        ref={popoverRef}
        className={`${isAbsolute ? "" : "fixed"} bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-6 border border-slate-100 w-[300px] animate-in fade-in zoom-in-95 duration-200 pointer-events-auto`}
        style={isAbsolute ? {} : { top: position.top, left: position.left }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5">
          <p className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Tool Name</p>
          <input
            type="text"
            className="w-full bg-white border-2 border-slate-100 rounded-xl p-3 text-sm font-bold text-black outline-none focus:border-black transition-all"
            placeholder="버튼 이름 (예: 자료 확인)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        
        <div className="mb-6">
          <p className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Link URL</p>
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-white border-2 border-slate-100 rounded-xl p-3 text-sm font-bold text-black outline-none focus:border-black transition-all"
            placeholder="https://..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div className="flex justify-end gap-3">
          <button 
            onClick={onClose} 
            className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-black transition-colors"
          >
            취소
          </button>
          <button 
            onClick={handleSave} 
            className="px-6 py-2.5 text-sm font-black bg-black text-white rounded-xl hover:bg-slate-800 transition-all shadow-lg active:scale-95"
          >
            저장하기
          </button>
        </div>
      </div>
    </div>
  );
};

export default UrlPopover;
