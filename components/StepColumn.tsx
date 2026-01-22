import React, { useState, useEffect, useRef } from 'react';
import { Step, Role, Task } from '../types';
import TaskCard from './TaskCard';

interface StepColumnProps {
  step: Step;
  tasks: Task[];
  isLocked: boolean;
  filter: Role;
  completedTasks: Set<string>;
  taskLinks: Map<string, { url: string, label: string }>;
  onToggleTask: (taskId: string) => void;
  onReorder?: (stepId: number, fromIdx: number, toIdx: number) => void;
  onContextMenu: (e: React.MouseEvent, taskId: string, currentUrl?: string, currentLabel?: string) => void;
  onEditContextMenu: (e: React.MouseEvent, task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onToast: (msg: string) => void;
  isLockedProject?: boolean;
  projectId: string; // New
  onAddTask?: () => void;
  children?: React.ReactNode;
  isSnapshotMode?: boolean;
  snapshotSelectedTasks?: Set<string>;
  onSnapshotTaskSelect?: (taskId: string) => void;
  displayIndex?: number;
  headerLeftButtons?: React.ReactNode;
  isClientView?: boolean;
}

const StepColumn: React.FC<StepColumnProps> = ({
  step,
  tasks,
  isLocked,
  filter,
  completedTasks,
  taskLinks,
  onToggleTask,
  onReorder,
  onContextMenu,
  onEditContextMenu,
  onDeleteTask,
  onToast,
  isLockedProject,
  projectId,
  onAddTask,
  children,
  isSnapshotMode,
  snapshotSelectedTasks,
  onSnapshotTaskSelect,
  displayIndex,
  headerLeftButtons,
  isClientView
}) => {
  /* Migration Safe Access: task.roles might be undefined during transition if data not migrated yet. 
     We treat missing roles as [Role.PM] or empty based on context, but let's safely access. */
  const visibleTasks = tasks.filter(t => {
    if (filter === Role.ALL) return true;
    const tRoles = t.roles || []; // Fallback empty array
    return tRoles.includes(filter);
  });

  const borderColors: Record<number, string> = {
    1: isLocked ? 'border-blue-100' : 'border-blue-500/30',
    2: isLocked ? 'border-violet-100' : 'border-violet-500/30',
    3: isLocked ? 'border-yellow-100' : 'border-yellow-500/30',
    4: isLocked ? 'border-orange-100' : 'border-orange-500/30',
    5: isLocked ? 'border-green-100' : 'border-green-500/30'
  };

  const activeBgColors: Record<number, string> = {
    1: 'bg-blue-100/50', 2: 'bg-violet-100/50', 3: 'bg-yellow-100/50', 4: 'bg-orange-100/50', 5: 'bg-green-100/50'
  };

  const borderColor = isLocked ? 'border-slate-200' : (borderColors[step.id] || 'border-slate-300');
  const bgColor = isLocked 
    ? 'bg-slate-50' 
    : (activeBgColors[step.id] || step.colorClass);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const scrollRafRef = useRef<number | null>(null);
  const mouseYRef = useRef<number>(0);

  // 드래그 중 스크롤 처리 로직 (휠 + 에지 자동 스크롤)
  useEffect(() => {
    if (draggedIndex === null) {
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
      return;
    }

    const handleGlobalWheel = (e: WheelEvent) => {
      window.scrollBy(0, e.deltaY);
    };

    const autoScroll = () => {
      const threshold = 150;
      const maxSpeed = 15;
      const viewHeight = window.innerHeight;
      const y = mouseYRef.current;

      let scrollSpeed = 0;
      if (y < threshold) {
        scrollSpeed = -maxSpeed * (1 - y / threshold);
      } else if (y > viewHeight - threshold) {
        scrollSpeed = maxSpeed * (1 - (viewHeight - y) / threshold);
      }

      if (scrollSpeed !== 0) {
        window.scrollBy(0, scrollSpeed);
      }
      scrollRafRef.current = requestAnimationFrame(autoScroll);
    };

    const handleGlobalDragOver = (e: DragEvent) => {
      mouseYRef.current = e.clientY;
    };

    window.addEventListener('wheel', handleGlobalWheel, { passive: true });
    window.addEventListener('dragover', handleGlobalDragOver, { passive: true });
    scrollRafRef.current = requestAnimationFrame(autoScroll);

    return () => {
      window.removeEventListener('wheel', handleGlobalWheel);
      window.removeEventListener('dragover', handleGlobalDragOver);
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    };
  }, [draggedIndex]);

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (isLocked || isLockedProject || draggedIndex === null) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const threshold = rect.top + rect.height / 2;

    const newIdx = e.clientY < threshold ? idx : idx + 1;
    if (dragOverIndex !== newIdx) {
      setDragOverIndex(newIdx);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (draggedIndex !== null && onReorder) {
      if (draggedIndex === targetIdx || draggedIndex === targetIdx - 1) {
        setDraggedIndex(null);
        setDragOverIndex(null);
        return;
      }
      onReorder(step.id, draggedIndex, targetIdx);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const getTaskProps = (task: Task) => ({
    task,
    stepId: step.id,
    isLockedStep: isLocked,
    isCompleted: completedTasks.has(task.id),
    linkUrl: taskLinks.get(task.id)?.url,
    linkLabel: taskLinks.get(task.id)?.label,
    onToggle: onToggleTask,
    onContextMenu,
    onEditContextMenu,
    onDelete: onDeleteTask,
    onToast,
    isLockedProject,
    projectId,
    isSnapshotMode,
    isSelectedForSnapshot: snapshotSelectedTasks?.has(task.id),
    onSnapshotSelect: () => onSnapshotTaskSelect?.(task.id),
    isClientView
  });

  const renderTasks = () => {
    const rendered = [];

    // 마지막 라운드 PM 태스크의 ID를 찾아 그 바로 밑에 조작 버튼을 넣기 위함
    const lastRoundPmId = (step.id === 3 || step.id === 4 || step.id === 2)
      ? [...visibleTasks].reverse().find(t => t.id.includes('-round-') && (t.id.endsWith('-pm') || t.id.endsWith('-prop')))?.id
      : null;

    let i = 0;
    while (i < visibleTasks.length) {
      const task = visibleTasks[i];
      const isTaskCompleted = completedTasks.has(task.id);
      const canDrag = !isLocked && !isLockedProject && !isTaskCompleted;
      const currentIndex = i;

      const roundMatch = task.id.match(/t([234])-round-(\d+)-(pm|prop)/);
      if ((step.id === 3 || step.id === 4 || step.id === 2) && roundMatch) {
        const stepNum = roundMatch[1];
        const roundNum = roundMatch[2];
        const nextTask = visibleTasks[i + 1];
        
        const isNextPartner = stepNum === '2' 
          ? nextTask?.id === `t${stepNum}-round-${roundNum}-feed` 
          : nextTask?.id === `t${stepNum}-round-${roundNum}-des`;

        rendered.push(
          <div
            key={`round-group-${roundNum}`}
            className={`mb-4 flex flex-col transition-all duration-300 relative ${draggedIndex === currentIndex ? 'opacity-20 scale-95 blur-[1px]' : 'opacity-100'}`}
            draggable={canDrag}
            onDragStart={() => canDrag && setDraggedIndex(currentIndex)}
            onDragEnd={() => { setDraggedIndex(null); setDragOverIndex(null); }}
            onDragOver={(e) => handleDragOver(e, currentIndex)}
            onContextMenu={(e) => e.stopPropagation()}
          >
            {dragOverIndex === currentIndex && draggedIndex !== null && (
              <div className="absolute top-[-10px] left-0 w-full h-[6px] bg-black/60 rounded-full z-[100] animate-pulse shadow-[0_0_10px_rgba(0,0,0,0.3)]"></div>
            )}

            <div className="mb-1 pl-2">
              <span className="text-[12px] md:text-[14px] font-bold bg-white/95 border border-black/10 px-4 py-1.5 rounded-full uppercase tracking-widest text-slate-700 shadow-sm inline-block">
                {roundNum}차 제안_Ver{roundNum}.0
              </span>
            </div>
            <div className="flex flex-col gap-2.5 p-1.5 md:p-2 bg-white/60 border border-white/70 rounded-[1.5rem] shadow-inner relative">
              <TaskCard {...getTaskProps(task)} />
              {isNextPartner && <TaskCard {...getTaskProps(nextTask)} />}
            </div>

            {currentIndex === visibleTasks.length - (isNextPartner ? 2 : 1) && dragOverIndex === visibleTasks.length && draggedIndex !== null && (
              <div className="absolute bottom-[-10px] left-0 w-full h-[6px] bg-black/60 rounded-full z-[100] animate-pulse shadow-[0_0_10px_rgba(0,0,0,0.3)]"></div>
            )}
          </div>
        );

        // +/- 버튼을 마지막 라운드 바로 아래에 매우 가깝게 배치
        if (task.id === lastRoundPmId && children) {
          rendered.push(
            <div key="round-controls-container" className="flex justify-center -mt-3 mb-5 relative z-20">
              <div className="bg-white/80 backdrop-blur-md p-1.5 rounded-full border border-white shadow-md">
                {children}
              </div>
            </div>
          );
        }

        i += isNextPartner ? 2 : 1;
      } else {
        rendered.push(
          <div
            key={task.id}
            className="relative flex flex-col"
            onDragOver={(e) => handleDragOver(e, currentIndex)}
          >
            {dragOverIndex === currentIndex && draggedIndex !== null && (
              <div className="absolute top-[-10px] left-0 w-full h-[6px] bg-black/60 rounded-full z-[100] animate-pulse shadow-[0_0_10px_rgba(0,0,0,0.3)]"></div>
            )}
            <div
              draggable={canDrag}
              onDragStart={() => canDrag && setDraggedIndex(currentIndex)}
              onDragEnd={() => { setDraggedIndex(null); setDragOverIndex(null); }}
              className={`transition-all duration-300 ${draggedIndex === currentIndex ? 'opacity-20 scale-95 blur-[2px]' : 'opacity-100'}`}
            >
              <TaskCard {...getTaskProps(task)} />
            </div>
            {currentIndex === visibleTasks.length - 1 && dragOverIndex === visibleTasks.length && draggedIndex !== null && (
              <div className="absolute bottom-[-10px] left-0 w-full h-[6px] bg-black/60 rounded-full z-[100] animate-pulse shadow-[0_0_10px_rgba(0,0,0,0.3)]"></div>
            )}
          </div>
        );
        i++;
      }
    }

    // 라운드 그룹이 없는 상태거나 렌더링에 실패한 경우의 폴백
    const hasRounds = visibleTasks.some(t => t.id.includes('-round-'));
    const renderedButtons = rendered.some(r => r.key === 'round-controls-container');
    if (step.id === 3 && hasRounds && !renderedButtons && children) {
      rendered.push(<div key="round-controls-container-fallback" className="my-1">{children}</div>);
    }

    return rendered;
  };

  return (
    <div
      className={`relative h-fit flex flex-col flex-1 w-full min-w-[280px] md:min-w-0 p-2.5 md:p-4 rounded-[1.25rem] md:rounded-[1.5rem] border transition-all duration-700 ${bgColor} ${borderColor} ${isLocked && !isSnapshotMode ? 'opacity-40 grayscale blur-[0.5px]' : 'opacity-100 shadow-2xl shadow-black/5'}`}
      onDragOver={(e) => {
        e.preventDefault();
        if (draggedIndex !== null && dragOverIndex === null) setDragOverIndex(visibleTasks.length);
      }}
      onDrop={(e) => handleDrop(e, dragOverIndex ?? visibleTasks.length)}
    >
      <div className="flex items-center mb-6 md:mb-8 relative z-10">
        <span className="bg-black text-[10px] md:text-[12px] font-bold px-3 py-2 rounded-xl border border-black mr-4 text-white uppercase tracking-tighter shadow-sm">
          STEP {String(displayIndex || step.id).padStart(2, '0')}
        </span>
        <h3 className="font-bold text-xl md:text-2xl text-black uppercase tracking-tight truncate">{step.title}</h3>
        <div className="ml-auto flex items-center gap-2 md:gap-3">
          {headerLeftButtons && (
            <div className="flex items-center gap-2 mr-2">
              {headerLeftButtons}
            </div>
          )}
          {!isLockedProject && onAddTask && (
            <button
              onClick={(e) => { e.stopPropagation(); onAddTask(); }}
              className={`w-10 h-10 md:w-11 md:h-11 rounded-full bg-white border ${borderColor} flex items-center justify-center text-slate-400 hover:bg-black hover:text-white hover:border-black transition-all shadow-md active:scale-90`}
              title="태스크 추가"
            >
              <i className="fa-solid fa-plus text-sm md:text-base"></i>
            </button>
          )}
        </div>
      </div>
      <div className="relative z-10 flex flex-col gap-3 h-full min-h-[150px]">
        {renderTasks()}
      </div>
    </div>
  );
};

export default StepColumn;