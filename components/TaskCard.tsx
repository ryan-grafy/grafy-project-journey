import React, { useState, useEffect, useRef } from 'react';
import { Role, Task } from '../types';
import FileDropzone from './FileDropzone';
import TodoList from './TodoList';

interface TaskCardProps {
  task: Task;
  isCompleted: boolean;
  isLockedStep: boolean;
  stepId: number;
  linkUrl?: string;
  linkLabel?: string;
  onToggle: (taskId: string) => void;
  onContextMenu: (e: React.MouseEvent, taskId: string, currentUrl?: string, currentLabel?: string) => void;
  onEditContextMenu: (e: React.MouseEvent, task: Task) => void;
  onDelete?: (taskId: string) => void;
  onToast: (msg: string) => void;
  isLockedProject?: boolean;
  projectId: string;
  isSnapshotMode?: boolean;
  onUpdateTask?: (taskId: string, updates: Partial<Task>) => void;
  isClientVisible?: boolean;
  isSelected?: boolean;
  onSnapshotSelect?: () => void;
  isClientView?: boolean;
  isDragging?: boolean;
}

const roleStyles: Record<Role, { style: string; icon: string }> = {
  [Role.ALL]: { style: '', icon: '' },
  [Role.CLIENT]: { style: 'bg-blue-100 text-blue-800', icon: 'fa-user' },
  [Role.PM]: { style: 'bg-orange-100 text-orange-800', icon: 'fa-briefcase' },
  [Role.DESIGNER]: { style: 'bg-pink-100 text-pink-800', icon: 'fa-palette' },
  [Role.MANAGER]: { style: 'bg-green-100 text-green-800', icon: 'fa-user-tie' },
  [Role.DEVELOPER]: { style: 'bg-purple-100 text-purple-800', icon: 'fa-code' },
};

const roleLabels: Record<Role, string> = {
  [Role.ALL]: '',
  [Role.CLIENT]: 'Client',
  [Role.PM]: 'PM',
  [Role.DESIGNER]: 'Designer',
  [Role.MANAGER]: 'Manager',
  [Role.DEVELOPER]: 'Developer',
};

const accentColors: Record<number, string> = {
  1: 'bg-blue-600', 2: 'bg-violet-600', 3: 'bg-yellow-500', 4: 'bg-orange-600', 5: 'bg-green-600',
};

const TaskCard: React.FC<TaskCardProps> = ({
  task, isCompleted, isLockedStep, stepId, linkUrl, linkLabel, onToggle, onContextMenu, onEditContextMenu, onDelete, onToast, isLockedProject, projectId,
  isSnapshotMode, isSelected, onSnapshotSelect, isClientView, onUpdateTask, isClientVisible, isDragging
}) => {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useEffect(() => {
    if (isConfirmingDelete) {
      const timer = setTimeout(() => setIsConfirmingDelete(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isConfirmingDelete]);

  const handleRightClickInfo = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isLockedProject) {
      onToast("잠긴 프로젝트는 수정할 수 없습니다.");
      return;
    }
    onEditContextMenu(e, task);
  };

  const handleContextMenuLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isLockedProject) {
      onToast("잠긴 프로젝트는 수정할 수 없습니다.");
      return;
    }
    onContextMenu(e, task.id, linkUrl, linkLabel);
  };

  const handleToggleClick = (e: React.MouseEvent) => {
    if (isSnapshotMode) {
      onSnapshotSelect?.();
      return;
    }
    if (isLockedProject) {
      onToast("잠긴 프로젝트는 수정할 수 없습니다.");
      return;
    }
    onToggle(task.id);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLockedProject) {
      onToast("잠긴 프로젝트의 태스크는 삭제할 수 없습니다.");
      return;
    }
    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
    } else {
      onDelete?.(task.id);
      setIsConfirmingDelete(false);
    }
  };

  const formatShortDate = (dateStr: string) => {
    if (!dateStr || dateStr === '00-00-00') return '00-00-00';
    const parts = dateStr.split('-');
    if (parts.length < 3) return dateStr;
    const yy = parts[0].slice(-2);
    return `${yy}-${parts[1]}-${parts[2]}`;
  };

  const pointColor = accentColors[stepId] || 'bg-black';
  const hoverClasses = !isDragging && !isCompleted ? 'hover:border-black/50 hover:-translate-y-1' : '';

  return (
    <div
      onClick={handleToggleClick}
      onContextMenu={handleRightClickInfo}
      className={`relative flex flex-col p-4 mb-2 bg-white border border-black/25 rounded-xl cursor-pointer min-h-[100px] group overflow-hidden transition-colors duration-200 ${hoverClasses} ${
        isSelected && !isClientView
          ? isSnapshotMode
            ? '!border-emerald-400 !border-[3px] ring-4 ring-emerald-50 z-50 shadow-[0_4px_20px_rgba(52,211,153,0.3)]'
            : '!border-blue-500 !border-[2.5px] z-50 ring-4 ring-blue-50'
          : ''
      }`}
      style={{
        filter: isLockedStep && !isSnapshotMode ? 'grayscale(0.5)' : 'grayscale(0)',
        transition: 'filter 200ms ease-in-out, transform 200ms ease-in-out'
      }}
    >
      <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
        {isClientVisible && !isClientView && (
          <div className="flex items-center justify-center w-7 h-7 bg-emerald-500 rounded-full shadow-sm" title="클라이언트 뷰 공개됨">
            <i className="fa-solid fa-magnifying-glass text-white text-[12px]"></i>
          </div>
        )}
        {isCompleted ? (
          <div className="flex items-center gap-2 w-7 h-7 justify-center">
            <i className="fa-solid fa-circle-check text-emerald-500 text-[28px] bg-white"></i>
          </div>
        ) : (
          !isLockedProject && (
            <button
              onClick={handleDeleteClick}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all border ${isConfirmingDelete ? 'bg-red-500 border-red-600 text-white animate-pulse' : 'bg-white border-slate-200 text-slate-400 hover:border-red-400 hover:text-red-500'}`}
              title={isConfirmingDelete ? "정말 삭제할까요?" : "태스크 삭제"}
            >
              <i className={`fa-solid ${isConfirmingDelete ? 'fa-times' : 'fa-minus'} text-[10px]`}></i>
            </button>
          )
        )}
      </div>

      <div className="mb-2 pr-10">
        <div className="flex flex-wrap gap-1 mb-[16px]">
          {task.roles && task.roles.length > 0 ? (
            task.roles.map(r => {
              const rInfo = roleStyles[r] || roleStyles[Role.PM];
              return (
                <span key={r} className={`text-[10px] font-bold px-2 py-1 rounded-md w-fit flex items-center gap-2 uppercase tracking-widest ${rInfo.style}`}>
                  <i className={`fa-solid ${rInfo.icon} text-[10px]`}></i>
                  {roleLabels[r]}
                </span>
              );
            })
          ) : (
            <span key="pm-fallback" className={`text-[10px] font-bold px-2 py-1 rounded-md w-fit flex items-center gap-2 uppercase tracking-widest ${roleStyles[Role.PM].style}`}>
              <i className={`fa-solid ${roleStyles[Role.PM].icon} text-[10px]`}></i>
              {roleLabels[Role.PM]}
            </span>
          )}
        </div>
        <h4 className="font-bold text-base md:text-lg mb-1 leading-tight tracking-tight text-black line-clamp-2 md:line-clamp-none">{task.title}</h4>
        {task.description && <p className="text-[12px] md:text-[13px] leading-snug font-semibold text-slate-500 line-clamp-3 md:line-clamp-4 break-all whitespace-normal">{task.description}</p>}

        {onUpdateTask && !isClientView && (
           <TodoList 
             todos={task.todos || []} 
             onUpdate={(newTodos) => onUpdateTask(task.id, { todos: newTodos })}
             isClientView={isClientView}
           />
        )}

        <div className="mt-1.5 inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-md">
          <i className="fa-solid fa-calendar-check text-slate-400 text-[9px]"></i>
          <span className="text-[10px] font-bold text-slate-700">
            마감: {formatShortDate(task.completed_date || '00-00-00')}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-[5px] mt-2">
        <div onClick={(e) => e.stopPropagation()}>
          <FileDropzone onToast={onToast} isCompleted={isCompleted} accentColor={pointColor} isLockedProject={isLockedProject} projectId={projectId} taskId={task.id} />
        </div>
        {(!isClientView || linkUrl) && (
          <button
            type="button"
            onContextMenu={handleContextMenuLink}
            onClick={(e) => {
              e.stopPropagation();
              linkUrl ? window.open(linkUrl, '_blank') : onToast("우클릭하여 링크를 설정해주세요.");
            }}
            className={`w-full inline-flex justify-center items-center gap-1.5 px-3 py-2.5 rounded-lg text-[13px] font-bold border transition-all ${linkUrl ? `${pointColor} text-white border-transparent hover:brightness-90` : 'bg-white text-slate-600 border-slate-200 hover:border-black hover:text-black'} overflow-hidden`}
          >
            <span className="truncate max-w-full">{linkUrl ? (linkLabel || "자료 확인") : "우클릭 링크 지정"}</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default React.memo(TaskCard);
