import React, { useState } from 'react';
import { Project } from '../types';
import { Lock, Check, Minus, X } from 'lucide-react';
import { STEPS_STATIC } from '../constants';

interface ProjectListProps {
  projects: Project[];
  onSelectProject: (project: Project) => void;
  isAdmin?: boolean;
  onDeleteProject?: (projectId: string) => void;
}

// 6-Color Palette from Image
const PALETTE = [
  'bg-[#F2F29D]', // Yellow
  'bg-[#FBCF9D]', // Orange
  'bg-[#ACA379]', // Olive
  'bg-[#F2D5D1]', // Pink
  'bg-[#DEDEF8]', // Lavender
  'bg-[#C4EAE9]', // Mint
];

// Helper to get consistent color from string hash
const getHashColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PALETTE.length;
  return PALETTE[index];
};

// Helper for 'Next Mission' status
const checkIfUrgent = (dateStr: string | undefined) => {
  if (!dateStr || dateStr === '-' || dateStr === '00-00-00') return false;
  
  try {
    let normalized = dateStr;
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts[0].length === 2) {
        normalized = `20${dateStr}`;
      }
    } else if (dateStr.length === 6) {
      normalized = `20${dateStr.slice(0,2)}-${dateStr.slice(2,4)}-${dateStr.slice(4,6)}`;
    }
    
    // Create UTC dates to avoid timezone shifts during comparison
    const taskDate = new Date(normalized);
    if (isNaN(taskDate.getTime())) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const diffTime = taskDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Urgent if deadline is within 7 days (diffDays <= 7) or already passed
    return diffDays <= 7;
  } catch {
    return false;
  }
};

export const ProjectList: React.FC<ProjectListProps> = ({ 
  projects, 
  onSelectProject,
  isAdmin = false,
  onDeleteProject
}) => {
  // Track confirmation state for deletion
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  // Custom grid template
  const gridTemplate = "60px 160px 120px 180px 150px 1fr 400px 200px";

  // General table font size is 14px
  const tableFontSize = "text-[14px]";
  // Next Mission specific font size is 12px
  const nextMissionFontSize = "text-[12px]";

  // Deeper Solid Red Point (Updated from #F17565 to #F06A58)
  const redPointColor = "bg-[#F06A58]";

  // Helper for formatting date with Korean day
  const formatDateWithDay = (dateStr: string | undefined) => {
    if (!dateStr || dateStr === '-' || dateStr === '00-00-00') return dateStr || '-';
    try {
      let yy, mm, dd;
      if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          yy = parts[0].length === 4 ? parts[0].slice(2) : parts[0];
          mm = parts[1];
          dd = parts[2];
        }
      } else if (dateStr.length === 6) {
        yy = dateStr.slice(0, 2);
        mm = dateStr.slice(2, 4);
        dd = dateStr.slice(4, 6);
      } else if (dateStr.length === 8) {
        yy = dateStr.slice(2, 4);
        mm = dateStr.slice(4, 6);
        dd = dateStr.slice(6, 8);
      }

      if (!yy || !mm || !dd) return dateStr;

      const d = new Date(`20${yy}-${mm}-${dd}`);
      if (isNaN(d.getTime())) return dateStr;
      const days = ['일', '월', '화', '수', '목', '금', '토'];
      return `${yy}-${mm}-${dd} (${days[d.getDay()]})`;
    } catch {
      return dateStr;
    }
  };

  // Helper to find the next task info
  const getNextTaskInfo = (p: Project) => {
    if (p.status >= 100) return { title: "프로젝트 종료!", date: "" };

    const completedSet = new Set(p.task_states?.completed || []);
    
    // Find first incomplete task across all steps
    for (const step of STEPS_STATIC) {
      const staticTasks = step.tasks || [];
      const customTasks = p.custom_tasks?.[step.id] || [];
      const order = p.task_order?.[step.id] || [];
      const deletedSet = new Set(p.deleted_tasks || []);

      let stepTasks: any[] = [];
      if (step.id === 2 || step.id === 3 || step.id === 4) {
        stepTasks = customTasks;
      } else {
        stepTasks = staticTasks.filter(st => !deletedSet.has(st.id));
        const additionalCustoms = customTasks.filter(ct => !staticTasks.some(st => st.id === ct.id));
        stepTasks = [...stepTasks, ...additionalCustoms];
        stepTasks = stepTasks.map(st => customTasks.find(ct => ct.id === st.id) || st);
      }

      if (order.length > 0) {
        stepTasks.sort((a, b) => {
          const idxA = order.indexOf(a.id);
          const idxB = order.indexOf(b.id);
          return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
        });
      }

      for (const t of stepTasks) {
        if (!completedSet.has(t.id)) {
          return { 
            title: t.title, 
            date: t.completed_date && t.completed_date !== '00-00-00' ? t.completed_date : "00-00-00" 
          };
        }
      }
    }

    return { title: "진행 중인 태스크...", date: "-" };
  };

  return (
    <div className="w-full font-['Pretendard_Variable'] font-normal text-black">
      {/* Table Header - Set to 14px */}
      <div 
        className={`grid bg-[#F0EBE7] border-b border-black items-center h-[30px] ${tableFontSize}`}
        style={{ gridTemplateColumns: gridTemplate }}
      >
        <div className="pl-4">No.</div>
        <div className="pl-4">Genre</div>
        <div className="pl-4">Start</div>
        <div className="pl-4">Next</div>
        <div className="pl-4">End</div>
        <div className="pl-4">Passenger / Project</div>
        <div className="pl-4">Pilots</div>
        <div className="pl-4">Flight time</div>
      </div>

      {/* Table Body - Row height 30px */}
      <div>
        {projects.map((p, index) => {
          // Derive Genre from name or defaults
          const genre = p.name.includes('Web') ? 'Web' : p.name.includes('App') ? 'App' : p.name.includes('Video') ? 'Video' : 'Branding';
          
          // Derive Pilots
          const pilots = [
            p.pm_name,
            p.designer_name,
            p.designer_2_name,
            p.designer_3_name
          ].filter(Boolean).map(name => ({ name }));

          const isCompleted = p.status >= 100;
          const nextInfo = getNextTaskInfo(p);
          const isUrgent = !isCompleted && checkIfUrgent(nextInfo.date);
          const isConfirming = confirmDeleteId === p.id;

          return (
            <div 
              key={p.id}
              onClick={() => onSelectProject(p)}
              onMouseLeave={() => setConfirmDeleteId(null)}
              className="group grid border-b border-black bg-[#F0EBE7] transition-colors duration-200 cursor-pointer h-[30px] items-stretch hover:bg-black/5"
              style={{ gridTemplateColumns: gridTemplate }}
            >
              {/* No / Delete Button */}
              <div className={`relative flex items-center pl-4 tabular-nums text-black ${tableFontSize}`}>
                {isAdmin ? (
                  <div className="flex items-center justify-start w-full h-full group/no">
                    {!isConfirming && (
                      <span className="group-hover/no:hidden">{index + 1}</span>
                    )}
                    
                    {!isConfirming && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(p.id);
                        }}
                        className="hidden group-hover/no:flex items-center justify-center w-5 h-5 rounded-full hover:bg-black/10 transition-colors"
                        title="Delete project"
                      >
                        <Minus size={14} strokeWidth={2.5} />
                      </button>
                    )}
                    {isConfirming && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteProject?.(p.id);
                          setConfirmDeleteId(null);
                        }}
                        className="flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                        title="Confirm deletion"
                      >
                        <X size={12} strokeWidth={3} />
                      </button>
                    )}
                  </div>
                ) : (
                  index + 1
                )}
              </div>

              {/* Genre - Show Template Name */}
              <div className={`flex items-center justify-center text-black ${tableFontSize} ${getHashColor(p.template_name || (genre === 'Video' ? '패키지' : (genre === 'Branding' ? '브랜딩' : genre)))}`}>
                {p.template_name || (genre === 'Video' ? '패키지' : (genre === 'Branding' ? '브랜딩' : genre))}
              </div>

              {/* Start Date */}
              <div className={`flex items-center pl-4 tabular-nums tracking-tight text-black ${tableFontSize}`}>
                {formatDateWithDay(p.start_date)}
              </div>

              {/* Next Mission - 12px */}
              <div className={`relative flex items-center overflow-hidden h-full w-full ${isCompleted ? 'bg-black' : ''}`}>
                 {/* Solid Red Background for Urgent */}
                 {isUrgent && <div className={`absolute inset-0 ${redPointColor}`} />}
                 
                 <div className={`relative z-10 w-full pl-4 pr-2 truncate leading-[1.2] ${isCompleted ? 'text-white' : 'text-black'} ${nextMissionFontSize}`}>
                    {isCompleted ? (
                      <div className="font-normal">프로젝트 종료</div>
                    ) : (
                      <>
                        <div className="font-normal">{formatDateWithDay(nextInfo.date)}</div>
                        <div className="truncate opacity-100">{nextInfo.title}</div>
                      </>
                    )}
                 </div>
              </div>

              {/* End Date */}
              <div className={`flex items-center pl-4 tabular-nums tracking-tight text-black ${tableFontSize}`}>
                {formatDateWithDay(p.end_date)}
              </div>

              {/* Client / Project */}
              <div className="flex items-center pl-4 min-w-0 pr-4">
                <div className={`flex items-center text-black ${tableFontSize} max-w-full truncate`}>
                  <span className="flex-shrink-0 truncate" title={p.name}>{p.name}</span>
                  {p.is_locked && <Lock size={12} className="ml-2 text-black flex-shrink-0 mb-[1px]" />}
                </div>
              </div>

              {/* Pilots */}
              <div className={`flex items-center pl-4 truncate text-black ${tableFontSize}`}>
                {pilots.map(pilot => pilot.name).join(', ')}
              </div>

              {/* Progress / Flight time */}
              <div className="relative h-full w-full flex items-center justify-start">
                  {/* Solid Red Progress Bar */}
                  <div 
                    className={`absolute left-0 top-0 bottom-0 ${redPointColor} transition-all duration-700 ease-out z-0`}
                    style={{ width: `${p.status}%` }}
                  />
                  
                  <div className="relative z-10 flex items-center gap-2 pl-4">
                    {p.status === 100 && (
                       <Check size={15} className="text-black" strokeWidth={1.5} />
                    )}
                    <span className={`tabular-nums text-black ${tableFontSize}`}>
                      {p.status}%
                    </span>
                  </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProjectList;
