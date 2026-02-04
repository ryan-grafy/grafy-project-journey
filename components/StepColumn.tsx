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
  const isDragging = draggedIndex !== null;
  const dragScrollTargetsRef = useRef<{ x: HTMLElement | null; y: HTMLElement | null }>({
    x: null,
    y: null,
  });
  const lastDragPointRef = useRef<{ x: number; y: number } | null>(null);
  const dragRafRef = useRef<number | null>(null);

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

  const findScrollableParent = (element: HTMLElement | null, axis: "x" | "y") => {
    let current = element?.parentElement || null;
    while (current) {
      const style = window.getComputedStyle(current);
      const overflow = axis === "x" ? style.overflowX : style.overflowY;
      const canScroll =
        (overflow === "auto" || overflow === "scroll") &&
        (axis === "x"
          ? current.scrollWidth > current.clientWidth
          : current.scrollHeight > current.clientHeight);
      if (canScroll) return current;
      current = current.parentElement;
    }
    return null;
  };

  const resolveDragScrollTargets = () => {
    const base = columnRef.current;
    if (!base) return;
    const horizontal =
      (base.closest("[data-task-scroll]") as HTMLElement | null) ||
      findScrollableParent(base, "x");
    const vertical =
      findScrollableParent(base, "y") ||
      (document.scrollingElement as HTMLElement | null);
    dragScrollTargetsRef.current = { x: horizontal, y: vertical };
  };

  const autoScrollOnDragPoint = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    
    // ALWAYS resolve targets to ensure we have them
    let { x, y } = dragScrollTargetsRef.current;
    if (!x) {
      // Try direct query first
      x = document.querySelector('[data-task-scroll="x"]') as HTMLElement | null;
      if (!x && columnRef.current) {
        x = columnRef.current.closest('[data-task-scroll]') as HTMLElement | null;
      }
      if (!x && columnRef.current) {
        x = findScrollableParent(columnRef.current, 'x');
      }
      if (x) dragScrollTargetsRef.current.x = x;
    }
    
    const edge = 200; // Increased for visibility
    const minStep = 15;
    const maxStep = 100;

    if (x) {
      const rect = x.getBoundingClientRect();
      let deltaX = 0;
      if (clientX < rect.left + edge) {
        const distance = rect.left + edge - clientX;
        deltaX = -Math.max(minStep, (distance / edge) * maxStep);
      } else if (clientX > rect.right - edge) {
        const distance = clientX - (rect.right - edge);
        deltaX = Math.max(minStep, (distance / edge) * maxStep);
      }
      if (deltaX !== 0) x.scrollBy({ left: deltaX });
    }

    if (y) {
      const rect = y.getBoundingClientRect();
      let deltaY = 0;
      if (clientY < rect.top + edge) {
        const distance = rect.top + edge - clientY;
        deltaY = -Math.max(minStep, (distance / edge) * maxStep);
      } else if (clientY > rect.bottom - edge) {
        const distance = clientY - (rect.bottom - edge);
        deltaY = Math.max(minStep, (distance / edge) * maxStep);
      }
      if (deltaY !== 0) y.scrollBy({ top: deltaY });
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    resolveDragScrollTargets();

    const handleWheel = (event: Event) => {
      const e = event as WheelEvent;
      
      // Ensure scroll targets - querySelector first for certainty
      let { x, y } = dragScrollTargetsRef.current;
      if (!x) {
        x = document.querySelector('[data-task-scroll="x"]') as HTMLElement | null;
        if (!x) resolveDragScrollTargets();
        if (x) dragScrollTargetsRef.current.x = x;
      }
      
      if (!x && !y) return;

      const wheelMultiplier = 5;
      const horizontalDelta = (e.deltaX !== 0 ? e.deltaX : e.deltaY) * wheelMultiplier;
      if (x && horizontalDelta !== 0) x.scrollBy({ left: horizontalDelta });
      if (!x && y && e.deltaY !== 0) y.scrollBy({ top: e.deltaY * wheelMultiplier });
      if (e.cancelable) e.preventDefault();
    };

    const handleDocumentDragOver = (e: DragEvent) => {
      lastDragPointRef.current = { x: e.clientX, y: e.clientY };
      if (e.cancelable) e.preventDefault();
    };

    const handleDocumentDrag = (e: DragEvent) => {
      lastDragPointRef.current = { x: e.clientX, y: e.clientY };
    };

    document.addEventListener("wheel", handleWheel, { passive: false, capture: true });
    window.addEventListener("wheel", handleWheel, { passive: false, capture: true });
    document.addEventListener("mousewheel", handleWheel, { passive: false, capture: true });
    window.addEventListener("mousewheel", handleWheel, { passive: false, capture: true });
    document.addEventListener("dragover", handleDocumentDragOver, { capture: true });
    document.addEventListener("drag", handleDocumentDrag, { capture: true });
    return () => {
      document.removeEventListener(
        "wheel",
        handleWheel,
        { capture: true } as AddEventListenerOptions,
      );
      window.removeEventListener(
        "wheel",
        handleWheel,
        { capture: true } as AddEventListenerOptions,
      );
      document.removeEventListener(
        "mousewheel",
        handleWheel,
        { capture: true } as AddEventListenerOptions,
      );
      window.removeEventListener(
        "mousewheel",
        handleWheel,
        { capture: true } as AddEventListenerOptions,
      );
      document.removeEventListener(
        "dragover",
        handleDocumentDragOver,
        { capture: true } as AddEventListenerOptions,
      );
      document.removeEventListener(
        "drag",
        handleDocumentDrag,
        { capture: true } as AddEventListenerOptions,
      );
    };
  }, [isDragging]);

  useEffect(() => {
    if (!isDragging) return;

    const tick = () => {
      if (lastDragPointRef.current) {
        autoScrollOnDragPoint(
          lastDragPointRef.current.x,
          lastDragPointRef.current.y,
        );
      }
      dragRafRef.current = requestAnimationFrame(tick);
    };

    dragRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (dragRafRef.current) cancelAnimationFrame(dragRafRef.current);
      dragRafRef.current = null;
      lastDragPointRef.current = null;
    };
  }, [isDragging]);

  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest(".task-card-container") ||
      target.closest("button") ||
      target.closest("input") ||
      target.closest(".group-frame")
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
    lastDragPointRef.current = { x: e.clientX, y: e.clientY };
    autoScrollOnDragPoint(e.clientX, e.clientY);

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
    isDragging,
  });

  const renderTasks = () => {
    const rendered = [];

    const currentStepGroups = groups;
    const groupByTaskId = new Map<
      string,
      { id: string; title: string; taskIds: string[] }
    >();
    const groupTasksMap = new Map<string, Task[]>();
    const groupLastIndexMap = new Map<string, number>();

    visibleTasks.forEach((task, index) => {
      const taskGroup = currentStepGroups.find((g) =>
        (g.taskIds || []).includes(task.id),
      );
      if (!taskGroup) return;
      groupByTaskId.set(task.id, taskGroup);
      const existing = groupTasksMap.get(taskGroup.id);
      if (existing) existing.push(task);
      else groupTasksMap.set(taskGroup.id, [task]);
      groupLastIndexMap.set(taskGroup.id, index);
    });

    const renderedGroupIds = new Set<string>();

    let i = 0;
    while (i < visibleTasks.length) {
      const task = visibleTasks[i];
      const canDrag = !isLockedProject;
      const currentIndex = i;

      // Check if task belongs to a group
      const taskGroup = groupByTaskId.get(task.id);

      if (taskGroup) {
        if (renderedGroupIds.has(taskGroup.id)) {
          i++;
          continue;
        }

        const groupTasks = groupTasksMap.get(taskGroup.id) || [];
        const groupStartIndex = currentIndex;
        const groupLastIndex = groupLastIndexMap.get(taskGroup.id);
        const canEditGroupTitle =
          !isClientView && !isLockedProject && !isDragging;

        renderedGroupIds.add(taskGroup.id);
        rendered.push(
            <div
              key={`group-${taskGroup.id}`}
              draggable={canDrag}
              onDragStart={() => {
                if (!canDrag) return;
                resolveDragScrollTargets();
                setDraggedIndex(groupStartIndex);
              }}
              onDrag={(e) => {
                lastDragPointRef.current = { x: e.clientX, y: e.clientY };
                autoScrollOnDragPoint(e.clientX, e.clientY);
              }}
              onDragEnd={() => {
                setDraggedIndex(null);
                setDragOverIndex(null);
              }}
            onDragOver={(e) => handleDragOver(e, groupStartIndex)}
            className={`mb-6 p-4 rounded-[20px] bg-black/5 border border-black/10 transition-all cursor-grab active:cursor-grabbing ${
              isDragging ? "" : "hover:bg-black/10"
            } group/folder group-frame relative ${
              draggedIndex === groupStartIndex
                ? "opacity-20 scale-95 blur-[2px]"
                : "opacity-100"
            }`}
          >
            {dragOverIndex === groupStartIndex && draggedIndex !== null && (
              <div className="absolute top-[-10px] left-0 w-full h-[6px] bg-black/60 rounded-full z-[100] animate-pulse shadow-[0_0_10px_rgba(0,0,0,0.3)]"></div>
            )}
            <div className={`relative z-10 ${isDragging ? "pointer-events-none" : ""}`}>
              <div className="flex items-center mb-5 px-2">
                {canEditGroupTitle && editingGroupId === taskGroup.id ? (
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
                    className={`text-[14px] font-bold text-black/80 tracking-tight ${
                      canEditGroupTitle
                        ? "cursor-pointer hover:text-black transition-colors"
                        : ""
                    }`}
                    onClick={() => {
                      if (!canEditGroupTitle) return;
                      setEditingGroupId(taskGroup.id);
                      setEditingGroupTitle(taskGroup.title);
                    }}
                  >
                    {taskGroup.title}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-3">
                {groupTasks.map((groupTask) => (
                  <div
                    key={groupTask.id}
                    ref={(el) => {
                      taskRefs.current[groupTask.id] = el;
                    }}
                    className="task-card-container"
                  >
                    <TaskCard {...getTaskProps(groupTask)} />
                  </div>
                ))}
              </div>
            </div>
            {groupLastIndex === visibleTasks.length - 1 &&
              dragOverIndex === visibleTasks.length &&
              draggedIndex !== null && (
                <div className="absolute bottom-[-10px] left-0 w-full h-[6px] bg-black/60 rounded-full z-[100] animate-pulse shadow-[0_0_10px_rgba(0,0,0,0.3)]"></div>
              )}
          </div>,
        );
        i++;
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
              ref={(el) => {
                taskRefs.current[task.id] = el;
              }}
              draggable={canDrag}
              onDragStart={() => {
                if (!canDrag) return;
                resolveDragScrollTargets();
                setDraggedIndex(currentIndex);
              }}
              onDrag={(e) => {
                lastDragPointRef.current = { x: e.clientX, y: e.clientY };
                autoScrollOnDragPoint(e.clientX, e.clientY);
              }}
              onDragEnd={() => {
                setDraggedIndex(null);
                setDragOverIndex(null);
              }}
              className={`task-card-container transition-all duration-300 cursor-grab active:cursor-grabbing ${
                draggedIndex === currentIndex ? "opacity-20 scale-95 blur-[2px]" : "opacity-100"
              }`}
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
      className={`flex flex-col flex-none w-[90vw] md:w-auto md:flex-1 md:min-w-[350px] max-w-[95vw] md:max-w-none rounded-[24px] md:rounded-[32px] border ${borderColor} ${bgColor} p-4 md:p-8 transition-all duration-500 relative select-none h-fit snap-center md:snap-align-none ${isLocked ? "opacity-65 grayscale brightness-95" : ""}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onDragOver={(e) => {
        e.preventDefault();
        lastDragPointRef.current = { x: e.clientX, y: e.clientY };
        autoScrollOnDragPoint(e.clientX, e.clientY);
        if (draggedIndex !== null && dragOverIndex === null)
          setDragOverIndex(visibleTasks.length);
      }}
      onDrop={(e) => handleDrop(e, dragOverIndex ?? visibleTasks.length)}
    >
      <div
        className={`flex items-center justify-between mb-6 md:mb-10 px-2 lg:px-4 ${
          isDragging ? "pointer-events-none" : ""
        }`}
      >
         {/* ... Header content ... */}
          <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full bg-black text-white text-[13px] md:text-[15px] font-bold shrink-0">
            {displayIndex || step.id}
          </div>
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              autoFocus
              className="bg-transparent border-b border-black text-[20px] md:text-[24px] font-bold outline-none w-32 md:w-48"
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
                if (e.key === "Escape") {
                  setEditTitle(step.title);
                  setIsEditingTitle(false);
                }
              }}
            />
          ) : (
            <h3
              className="text-[20px] md:text-[24px] font-bold text-black tracking-tighter cursor-pointer line-clamp-1"
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
              className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/50 border border-black/5 flex items-center justify-center hover:bg-black hover:text-white transition-all shadow-sm active:scale-95"
            >
              <i className="fa-solid fa-plus text-xs md:text-sm"></i>
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
