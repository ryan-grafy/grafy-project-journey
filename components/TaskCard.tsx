import React, { useState, useEffect } from 'react';
import { Role, Task } from '../types';
import FileDropzone from './FileDropzone';

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
  projectId: string; // New
  isSnapshotMode?: boolean;
  isSelectedForSnapshot?: boolean;
  onSnapshotSelect?: () => void;
}

const roleStyles: Record<Role, { style: string; icon: string }> = {
  [Role.ALL]: { style: '', icon: '' },
  [Role.CLIENT]: { style: 'bg-blue-100 text-blue-800', icon: 'fa-user' },
  [Role.PM]: { style: 'bg-orange-100 text-orange-800', icon: 'fa-briefcase' },
  [Role.DESIGNER]: { style: 'bg-pink-100 text-pink-800', icon: 'fa-palette' },
  [Role.MANAGER]: { style: 'bg-green-100 text-green-800', icon: 'fa-user-tie' },
};

const roleLabels: Record<Role, string> = {
  [Role.ALL]: '',
  [Role.CLIENT]: 'Client',
  [Role.PM]: 'PM',
  [Role.DESIGNER]: 'Designer',
  [Role.MANAGER]: 'Manager',
};

const accentColors: Record<number, string> = {
  1: 'bg-blue-600', 2: 'bg-violet-600', 3: 'bg-yellow-500', 4: 'bg-green-600',
};

const TaskCard: React.FC<TaskCardProps> = ({
  task, isCompleted, isLockedStep, stepId, linkUrl, linkLabel, onToggle, onContextMenu, onEditContextMenu, onDelete, onToast, isLockedProject, projectId,
  isSnapshotMode, isSelectedForSnapshot, onSnapshotSelect
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
    // 팝업이 떠 있는 상태에서 태스크 클릭 시 팝업이 닫힐 수 있도록 stopPropagation을 제거합니다.
    if (isSnapshotMode) {
      onSnapshotSelect?.();
      return;
    }
    if (isLockedStep && !isCompleted) {
      onToast("이전 스텝 완료가 필요합니다.");
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
  const roleInfo = roleStyles[task.role] || roleStyles[Role.PM];

  return (
    <div
      onClick={handleToggleClick}
      onContextMenu={handleRightClickInfo}
      className={`relative flex flex-col p-4 mb-2 bg-white border rounded-2xl cursor-pointer transition-all duration-300 min-h-[100px] group ${isCompleted ? 'bg-white border-black/10 opacity-80 shadow-inner' : 'border-black/25 hover:border-black/50 hover:-translate-y-1 hover:shadow-xl shadow-sm'} ${isLockedStep && !isSnapshotMode ? 'cursor-not-allowed grayscale-[0.5]' : ''} ${isSelectedForSnapshot ? '!border-red-500 !border-4 !ring-2 !ring-red-200 z-50' : ''}`}
    >
      <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
        {isCompleted ? (
          <div className="flex items-center gap-2">
            {(isLockedProject || isLockedStep) && <i className="fa-solid fa-lock text-slate-300 text-[10px]"></i>}
            <i className="fa-solid fa-circle-check text-emerald-500 text-2xl shadow-sm rounded-full bg-white"></i>
          </div>
        ) : (
          !isLockedProject && (
            <button
              onClick={handleDeleteClick}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-sm border ${isConfirmingDelete ? 'bg-red-500 border-red-600 text-white animate-pulse' : 'bg-white border-slate-200 text-slate-400 hover:border-red-400 hover:text-red-500'}`}
              title={isConfirmingDelete ? "정말 삭제할까요?" : "태스크 삭제"}
            >
              <i className={`fa-solid ${isConfirmingDelete ? 'fa-times' : 'fa-minus'} text-[10px]`}></i>
            </button>
          )
        )}
      </div>

      <div className="mb-2 pr-10">
        <span className={`text-[10px] font-black px-2 py-1 rounded-lg w-fit mb-[16px] flex items-center gap-2 uppercase tracking-widest ${roleInfo.style}`}>
          <i className={`fa-solid ${roleInfo.icon} text-[9px]`}></i>
          {roleLabels[task.role]}
        </span>
        <h4 className="font-bold text-lg mb-1 leading-tight tracking-tight text-black">{task.title}</h4>
        {task.description && <p className="text-[12.5px] leading-snug font-bold text-slate-500 line-clamp-2">{task.description}</p>}

        <div className="mt-1.5 inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-full">
          <i className="fa-solid fa-calendar-check text-slate-400 text-[9px]"></i>
          <span className="text-[10px] font-black text-slate-700">
            마감: {formatShortDate(task.completed_date || '00-00-00')}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-[5px] mt-2">
        <div onClick={(e) => e.stopPropagation()}>
          <FileDropzone onToast={onToast} isCompleted={isCompleted} accentColor={pointColor} isLockedProject={isLockedProject || isLockedStep} projectId={projectId} taskId={task.id} />
        </div>
        <button
          type="button"
          onContextMenu={handleContextMenuLink}
          onClick={(e) => {
            e.stopPropagation();
            linkUrl ? window.open(linkUrl, '_blank') : onToast("우클릭하여 링크를 설정해주세요.");
          }}
          className={`w-full inline-flex justify-center items-center gap-1.5 px-3 py-2.5 rounded-xl text-[13px] font-black border transition-all ${linkUrl ? `${pointColor} text-white border-transparent hover:brightness-90 shadow-md` : 'bg-white text-slate-600 border-slate-200 hover:border-black hover:text-black'}`}
        >
          {linkUrl ? (linkLabel || "자료 확인") : "우클릭 링크 지정"}
        </button>
      </div>
    </div>
  );
};

export default TaskCard;