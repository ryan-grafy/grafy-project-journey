import React, { useState, useEffect, useRef } from "react";
import { Step, Role, Task } from "../types";
import TaskCard from "./TaskCard";

interface StepColumnProps {
  step: Step;
  tasks: Task[];
  isLocked: boolean;
  filter: Role;
  completedTasks: Set<string>;
  taskLinks: Map<string, { url: string; label: string }>;
  onToggleTask: (taskId: string) => void;
  onReorder?: (stepId: number, fromIdx: number, toIdx: number) => void;
  onContextMenu: (
    e: React.MouseEvent,
    taskId: string,
    currentUrl?: string,
    currentLabel?: string,
  ) => void;
  onEditContextMenu: (e: React.MouseEvent, task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onToast: (msg: string) => void;
  isLockedProject?: boolean;
  projectId: string;
  onAddTask?: () => void;
  children?: React.ReactNode;
  isSnapshotMode?: boolean;
  snapshotSelectedTasks?: Set<string>;
  onSnapshotTaskSelect?: (taskId: string) => void;
  displayIndex?: number;
  headerLeftButtons?: React.ReactNode;
  isClientView?: boolean;
  onUpdateTask?: (taskId: string, updates: Partial<Task>) => void;
  clientVisibleTasks?: Set<string>;
  onUpdateTitle?: (newTitle: string) => void;
  selectedTaskIds?: Set<string>;
  onTaskToggleSelect?: (taskId: string, multi?: boolean) => void;
  onTaskBulkSelect?: (taskIds: string[]) => void;
  onClearSelection?: () => void;
  groups?: { id: string; title: string; taskIds: string[] }[];
  onUpdateGroupTitle?: (
    stepId: number,
    groupId: string,
    newTitle: string,
  ) => void;
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
  isClientView,
  onUpdateTask,
  clientVisibleTasks,
  onUpdateTitle,
  selectedTaskIds = new Set(),
  onTaskToggleSelect,
  onTaskBulkSelect,
  onClearSelection,
  groups = [],
  onUpdateGroupTitle,
}) => {
  const visibleTasks = tasks.filter((t) => {
    if (filter === Role.ALL) return true;
    const tRoles = t.roles || [];
    return tRoles.includes(filter);
  });

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dropLineIndex, setDropLineIndex] = useState<number | null>(null); // Keep for compatibility

  // Title & Group Title Editing
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(step.title);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupTitle, setEditingGroupTitle] = useState("");

  useEffect(() => {
    setEditTitle(step.title);
  }, [step.title]);

  // Lasso Selection optimized
  const [lassoStart, setLassoStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [lassoEnd, setLassoEnd] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [previewSelectedIds, setPreviewSelectedIds] = useState<Set<string>>(
    new Set(),
  );
  const columnRef = useRef<HTMLDivElement>(null);
  const taskRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Cache rects on drag start to avoid layout thrashing
  const cachedRects = useRef<
    Map<string, { x1: number; y1: number; x2: number; y2: number }>
  >(new Map());

  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest(".task-card-container") ||
      target.closest("button") ||
      target.closest("input")
    )
      return;

    if (columnRef.current) {
      const rect = columnRef.current.getBoundingClientRect();
      const startX = e.clientX - rect.left;
      const startY = e.clientY - rect.top;

      setLassoStart({ x: startX, y: startY });
      setLassoEnd({ x: startX, y: startY });
      setPreviewSelectedIds(new Set());
      if (!e.ctrlKey && !e.shiftKey) onClearSelection?.();

      // Pre-calculate all task positions once
      cachedRects.current.clear();
      visibleTasks.forEach((task) => {
        const el = taskRefs.current[task.id];
        if (el) {
          const tRect = el.getBoundingClientRect();
          cachedRects.current.set(task.id, {
            x1: tRect.left - rect.left,
            y1: tRect.top - rect.top,
            x2: tRect.right - rect.left,
            y2: tRect.bottom - rect.top,
          });
        }
      });
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (lassoStart && columnRef.current) {
      const rect = columnRef.current.getBoundingClientRect();
      const currentEnd = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      setLassoEnd(currentEnd);

      const x1 = Math.min(lassoStart.x, currentEnd.x);
      const y1 = Math.min(lassoStart.y, currentEnd.y);
      const x2 = Math.max(lassoStart.x, currentEnd.x);
      const y2 = Math.max(lassoStart.y, currentEnd.y);

      const nextPreview = new Set<string>();

      // Use cached rects for intersection test
      cachedRects.current.forEach((tRect, taskId) => {
        const isIntersecting = !(
          x2 < tRect.x1 ||
          x1 > tRect.x2 ||
          y2 < tRect.y1 ||
          y1 > tRect.y2
        );
        if (isIntersecting) nextPreview.add(taskId);
      });

      // Only update state if different
      setPreviewSelectedIds((prev) => {
        if (prev.size !== nextPreview.size) return nextPreview;
        for (const id of nextPreview) if (!prev.has(id)) return nextPreview;
        return prev;
      });
    }
  };

  const handlePointerUp = () => {
    if (lassoStart) {
      // Only trigger if drag was active
      if (previewSelectedIds.size > 0 && onTaskBulkSelect) {
        onTaskBulkSelect(Array.from(previewSelectedIds));
      }
    }
    setLassoStart(null);
    setLassoEnd(null);
    setPreviewSelectedIds(new Set());
    cachedRects.current.clear(); // cleanup
  };

  const borderColor = isLocked ? "border-slate-300" : step.borderColorClass;
  const bgColor = isLocked ? "bg-slate-200" : step.colorClass;

  // Production-proven drag handlers
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (isLockedProject || draggedIndex === null) return;

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
      // GitHub production logic: prevent dropping at same or adjacent position
      if (draggedIndex === targetIdx || draggedIndex === targetIdx - 1) {
        setDraggedIndex(null);
        setDragOverIndex(null);
        return;
      }
      // Pass indices directly to onReorder - no adjustment needed
      onReorder(step.id, draggedIndex, targetIdx);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };


  const getTaskProps = (task: Task) => ({
    task,
    onToggle: () => onToggleTask(task.id),
    isCompleted: completedTasks.has(task.id),
    isLockedStep: isLocked,
    stepId: step.id,
    linkUrl: taskLinks.get(task.id)?.url,
    linkLabel: taskLinks.get(task.id)?.label,
    onContextMenu: (e: React.MouseEvent) =>
      onContextMenu(
        e,
        task.id,
        taskLinks.get(task.id)?.url,
        taskLinks.get(task.id)?.label,
      ),
    onEditContextMenu: (e: React.MouseEvent) => onEditContextMenu(e, task),
    onDelete: () => onDeleteTask(task.id),
    onToast,
    isLockedProject,
    projectId,
    isSnapshotMode,
    isSelected:
      snapshotSelectedTasks?.has(task.id) ||
      selectedTaskIds.has(task.id) ||
      previewSelectedIds.has(task.id),
    onSnapshotSelect: () =>
      isSnapshotMode
        ? onSnapshotTaskSelect?.(task.id)
        : onTaskToggleSelect?.(task.id),
    onUpdateTask,
    isClientVisible: clientVisibleTasks?.has(task.id),
    isClientView,
  });

  const renderTasks = () => {
    const rendered = [];

    let i = 0;
    while (i < visibleTasks.length) {
      const task = visibleTasks[i];
      const canDrag = !isLockedProject; // ✅ Allow all tasks to drag, including completed
      const currentIndex = i;

      // Check if task belongs to a group
      const taskGroup = groups.find((g) => g.taskIds.includes(task.id));

      if (taskGroup) {
        // Render group with all its tasks
        const isFirstInGroup = taskGroup.taskIds[0] === task.id;

        if (isFirstInGroup) {
          const groupTasks = visibleTasks.filter((t) =>
            taskGroup.taskIds.includes(t.id),
          );

          rendered.push(
            <div
              key={`group-${taskGroup.id}-${currentIndex}`}
              className="mb-6 p-4 rounded-[20px] bg-black/5 border border-black/10 transition-all hover:bg-black/10 group/folder relative"
            >
              <div className="relative z-10">
                <div className="flex items-center mb-5 px-2">
                  {editingGroupId === taskGroup.id ? (
                    <input
                      autoFocus
                      className="bg-white border border-black/10 rounded-xl px-4 py-1.5 text-sm font-bold outline-none shadow-sm w-full"
                      value={editingGroupTitle}
                      onChange={(e) => setEditingGroupTitle(e.target.value)}
                      onBlur={() => {
                        onUpdateGroupTitle?.(step.id, taskGroup.id, editingGroupTitle);
                        setEditingGroupId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          onUpdateGroupTitle?.(step.id, taskGroup.id, editingGroupTitle);
                          setEditingGroupId(null);
                        }
                      }}
                    />
                  ) : (
                    <span
                      className="text-[14px] font-bold text-black/80 cursor-pointer hover:text-black transition-colors tracking-tight"
                      onClick={() => {
                        setEditingGroupId(taskGroup.id);
                        setEditingGroupTitle(taskGroup.title);
                      }}
                    >
                      {taskGroup.title}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-3">
                  {groupTasks.map((groupTask) => {
                    // ✅ Use actual index from visibleTasks for correct DnD
                    const taskIdx = visibleTasks.indexOf(groupTask);
                    return (
                      <div
                        key={groupTask.id}
                        className="relative flex flex-col"
                        onDragOver={(e) => handleDragOver(e, taskIdx)}
                      >
                        {dragOverIndex === taskIdx && draggedIndex !== null && (
                          <div className="absolute top-[-10px] left-0 w-full h-[6px] bg-black/60 rounded-full z-[100] animate-pulse shadow-[0_0_10px_rgba(0,0,0,0.3)]"></div>
                        )}
                        <div
                          ref={(el) => (taskRefs.current[groupTask.id] = el)}
                          draggable={canDrag}
                          onDragStart={() => canDrag && setDraggedIndex(taskIdx)}
                          onDragEnd={() => {
                            setDraggedIndex(null);
                            setDragOverIndex(null);
                          }}
                          className={`task-card-container transition-all duration-300 ${draggedIndex === taskIdx ? "opacity-20 scale-95 blur-[2px]" : "opacity-100"}`}
                        >
                          <TaskCard {...getTaskProps(groupTask)} />
                        </div>
                        {taskIdx === visibleTasks.length - 1 &&
                          dragOverIndex === visibleTasks.length &&
                          draggedIndex !== null && (
                            <div className="absolute bottom-[-10px] left-0 w-full h-[6px] bg-black/60 rounded-full z-[100] animate-pulse shadow-[0_0_10px_rgba(0,0,0,0.3)]"></div>
                          )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>,
          );

          i += groupTasks.length;
        } else {
          i++;
        }
      } else {
        // Single task (no group)
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
              ref={(el) => (taskRefs.current[task.id] = el)}
              draggable={canDrag}
              onDragStart={() => canDrag && setDraggedIndex(currentIndex)}
              onDragEnd={() => {
                setDraggedIndex(null);
                setDragOverIndex(null);
              }}
              className={`task-card-container transition-all duration-300 ${draggedIndex === currentIndex ? "opacity-20 scale-95 blur-[2px]" : "opacity-100"}`}
            >
              <TaskCard {...getTaskProps(task)} />
            </div>
            {currentIndex === visibleTasks.length - 1 &&
              dragOverIndex === visibleTasks.length &&
              draggedIndex !== null && (
                <div className="absolute bottom-[-10px] left-0 w-full h-[6px] bg-black/60 rounded-full z-[100] animate-pulse shadow-[0_0_10px_rgba(0,0,0,0.3)]"></div>
              )}
          </div>,
        );
        i++;
      }
    }

    if (children)
      rendered.push(
        <div key="children" className="mt-4">
          {children}
        </div>,
      );

    return rendered;
  };

  return (
    <div
      ref={columnRef}
      className={`flex flex-col flex-1 min-w-[300px] rounded-[20px] border ${borderColor} ${bgColor} p-4 md:p-6 transition-all duration-500 relative select-none h-fit ${isLocked ? "opacity-65 grayscale brightness-95" : ""}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onDragOver={(e) => {
        e.preventDefault();
        if (draggedIndex !== null && dragOverIndex === null)
          setDragOverIndex(visibleTasks.length);
      }}
      onDrop={(e) => handleDrop(e, dragOverIndex ?? visibleTasks.length)}
    >
      <div className="flex items-center justify-between mb-8 px-2">
         {/* ... Header content ... */}
          <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-black text-white text-[13px] font-bold">
            {displayIndex || step.id}
          </div>
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              className="bg-transparent border-b border-black text-[22px] font-bold outline-none w-40"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={() => {
                setIsEditingTitle(false);
                onUpdateTitle?.(editTitle);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onUpdateTitle?.(editTitle);
                  setIsEditingTitle(false);
                }
              }}
            />
          ) : (
            <h3
              className="text-[22px] font-bold text-black tracking-tighter cursor-pointer"
              onClick={() => !isClientView && setIsEditingTitle(true)}
            >
              {step.title}
            </h3>
          )}
        </div>
        <div className="flex items-center gap-2">
          {headerLeftButtons}
          {!isClientView && (
            <button
              onClick={onAddTask}
              className="w-10 h-10 rounded-full bg-white/50 border border-black/5 flex items-center justify-center hover:bg-black hover:text-white transition-all shadow-sm active:scale-95"
            >
              <i className="fa-solid fa-plus text-xs"></i>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 min-h-[50px]">{renderTasks()}</div>

      {lassoStart && lassoEnd && (
        <div
          className="absolute border border-blue-500 bg-blue-500/10 pointer-events-none z-[1000] rounded-sm"
          style={{
            left: Math.min(lassoStart.x, lassoEnd.x),
            top: Math.min(lassoStart.y, lassoEnd.y),
            width: Math.abs(lassoStart.x - lassoEnd.x),
            height: Math.abs(lassoStart.y - lassoEnd.y),
          }}
        />
      )}
    </div>
  );
};

export default StepColumn;
