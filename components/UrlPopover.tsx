import React, { useLayoutEffect, useRef, useState } from 'react';
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
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isVisible, setIsVisible] = useState(false);

  // 팝업 외부 클릭 감지 리스너
  useLayoutEffect(() => {
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

  useLayoutEffect(() => {
    if (popoverState.isOpen) {
        setUrl(popoverState.currentUrl);
        setLabel(popoverState.currentLabel);
    }
  }, [popoverState.isOpen, popoverState.currentUrl, popoverState.currentLabel]);

  useLayoutEffect(() => {
    if (popoverState.isOpen && popoverRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);

      const { offsetWidth: width, offsetHeight: height } = popoverRef.current;
      
      const viewWidth = window.innerWidth;
      const viewHeight = window.innerHeight;
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;

      const margin = 20;

      // X: Start slightly right of cursor
      let nextLeft = popoverState.x + 10;

      // Y: Center popup vertically on the cursor position
      let nextTop = popoverState.y - (height / 2);

      // --- Horizontal Constraint ---
      if (nextLeft + width > scrollX + viewWidth - margin) {
          nextLeft = popoverState.x - width - 10;
      }
      if (nextLeft < scrollX + margin) {
          nextLeft = scrollX + margin;
      }

      // --- Vertical Constraint (Clamping) ---
      if (nextTop < scrollY + margin) {
          nextTop = scrollY + margin;
      }
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
  }, [popoverState.isOpen, popoverState.x, popoverState.y]);

  if (!popoverState.isOpen || !popoverState.taskId) return null;

  const handleSave = () => {
    let finalUrl = url.trim();
    onSave(popoverState.taskId!, finalUrl, label.trim());
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') onClose();
  };

  return (
    <div className="absolute z-[120]" style={{ top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      <div className="fixed inset-0 pointer-events-auto" onClick={onClose}></div>
      <div 
        ref={popoverRef}
        className={`absolute bg-white rounded-xl shadow-2xl p-6 border border-slate-200 w-[300px] pointer-events-auto transition-opacity duration-150 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        style={{ top: position.top, left: position.left }}
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
