import React, { useState, useMemo, useEffect } from 'react';
import { Project, User, Role, Task } from '../types';
import { STEPS_STATIC } from '../constants';
import DeletedDataModal from './DeletedDataModal';

interface ProjectListProps {
  projects: Project[];
  user: User;
  onSelectProject: (project: Project) => void;
  onNewProject: () => void;
  onManageTeam: () => void;
  onDeleteProject: (projectId: string) => void;
  onLogout: () => void;
  onLogin: () => void;
  isLoading: boolean;
  deletedProjects: Project[];
  onRestoreProject: (id: string) => void;
}

type SortOption = 'recent_created' | 'name' | 'progress' | 'recent_ended';

interface ProjectRowItemProps {
  project: Project;
  index: number;
  total: number;
  onSelectProject: (p: Project) => void;
  onDeleteProject: (id: string) => void;
  getTeamString: (p: Project) => string;
  currentEmail?: string;
}

const getNextSchedule = (project: Project): { date: string, title: string, isOverdue: boolean } | null => {
  const completedSet = new Set(project.task_states?.completed || []);
  const deletedSet = new Set(project.deleted_tasks || []);
  const customTasks = project.custom_tasks || {};
  const taskOrder = project.task_order || {};

  const stepIds = [1, 2, 3, 4];
  
  for (const stepId of stepIds) {
    let tasks: Task[] = [];
    
    // 1. Collect Base Tasks
    if (stepId === 2) {
        const roundCount = project.rounds_navigation_count || 1;
        for (let r = 1; r <= roundCount; r++) {
            tasks.push({ id: `t2-round-${r}-prop`, title: `${r}차 제안`, completed_date: '00-00-00', roles: [Role.PM, Role.DESIGNER] });
            tasks.push({ id: `t2-round-${r}-feed`, title: `${r}차 피드백`, completed_date: '00-00-00', roles: [Role.CLIENT, Role.PM] });
        }
    } else if (stepId === 3) {
        tasks.push(STEPS_STATIC[2].tasks[0]); // Base 1
        const roundCount = project.rounds_count || 2;
        for (let r = 1; r <= roundCount; r++) {
            tasks.push({ id: `t3-round-${r}-pm`, title: `${r}차 피드백 수급`, completed_date: '00-00-00', roles: [Role.PM] });
            tasks.push({ id: `t3-round-${r}-des`, title: `${r}차 수정`, completed_date: '00-00-00', roles: [Role.DESIGNER] });
        }
        tasks.push(STEPS_STATIC[2].tasks[1]); // Final
    } else if (stepId === 4) {
        const roundCount = project.rounds2_count || 2;
        for (let r = 1; r <= roundCount; r++) {
            tasks.push({ id: `t4-round-${r}-pm`, title: `${r}차 피드백 수급`, completed_date: '00-00-00', roles: [Role.PM] });
            tasks.push({ id: `t4-round-${r}-des`, title: `${r}차 수정`, completed_date: '00-00-00', roles: [Role.DESIGNER] });
        }
    } else {
        tasks = [...(STEPS_STATIC.find(s => s.id === stepId)?.tasks || [])];
    }

    // 2. Merge Custom Tasks (Override info or Add new)
    const stepCustoms = customTasks[stepId] || [];
    // Override existing
    tasks = tasks.map(t => {
        const found = stepCustoms.find(ct => ct.id === t.id);
        if (found) return { ...t, ...found };
        return t;
    });
    // Add pure custom tasks
    const pureCustoms = stepCustoms.filter(ct => !tasks.some(t => t.id === ct.id));
    tasks = [...tasks, ...pureCustoms];

    // 3. Filter Deleted
    tasks = tasks.filter(t => !deletedSet.has(t.id));

    // 4. Sort by Order
    const order = taskOrder[stepId];
    if (order && order.length > 0) {
        tasks.sort((a, b) => {
            const idxA = order.indexOf(a.id);
            const idxB = order.indexOf(b.id);
            const valA = idxA === -1 ? 999 : idxA;
            const valB = idxB === -1 ? 999 : idxB;
            return valA - valB;
        });
    }

    // 5. Find First Incomplete
    for (const t of tasks) {
        if (!completedSet.has(t.id)) {
            const dateStr = t.completed_date || '00-00-00';
            let isOverdue = false;
            
            if (dateStr !== '00-00-00') {
               try {
                  const today = new Date();
                  today.setHours(0,0,0,0);
                  const parts = dateStr.split('-');
                  if(parts.length === 3) {
                    const fullYear = parseInt(parts[0]) + 2000;
                    const d = new Date(fullYear, parseInt(parts[1])-1, parseInt(parts[2]));
                    if (d < today) isOverdue = true;
                  }
               } catch(e) {}
            }

            return {
                title: t.title,
                date: dateStr,
                isOverdue
            };
        }
    }
  }

  return null;
};

const ProjectRowItem: React.FC<ProjectRowItemProps> = ({ project, index, total, onSelectProject, onDeleteProject, getTeamString, currentEmail }) => {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useEffect(() => {
    if (isConfirmingDelete) {
      const timer = setTimeout(() => setIsConfirmingDelete(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isConfirmingDelete]);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent link navigation
    e.stopPropagation();
    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
    } else {
      onDeleteProject(project.id);
      setIsConfirmingDelete(false);
    }
  };

  const isCompleted = project.status === 100;
  const isLast = index === total - 1;

  const nextSchedule = getNextSchedule(project);
  const isProjectEnded = project.status === 100 && project.is_locked;

  const handleRowClick = (e: React.MouseEvent) => {
    // Allow default browser behavior for modifier keys (Ctrl+Click, Cmd+Click, Shift+Click, Middle Click)
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) {
      return;
    }
    e.preventDefault();
    onSelectProject(project);
  };

  return (
    <>
      {/* Desktop Row View */}
      <div
        className={`hidden md:grid grid-cols-12 border-b border-slate-100 hover:bg-slate-50/50 transition-all items-center group relative h-[33px] ${isLast ? 'rounded-b-[1rem] md:rounded-b-[1.25rem] border-b-0' : ''}`}
      >
        <a 
          href={`?project=${project.id}`}
          onClick={handleRowClick}
          className="absolute inset-0 z-0 block"
        ></a>

        <div className="col-span-1 px-4 py-0.5 flex items-center justify-center text-slate-300 font-black text-xl group-hover:text-black transition-colors border-r border-slate-100 relative z-10 pointer-events-none">
          {String(index + 1).padStart(2, '0')}
        </div>
        <div className="col-span-1 px-2 py-0.5 flex items-center justify-center text-[13px] font-bold text-slate-400 border-r border-slate-100 overflow-hidden relative z-10 pointer-events-none">
          <span className="truncate" title={project.template_name || '-'}>{project.template_name || '-'}</span>
        </div>
        <div className="col-span-1 px-4 py-0.5 flex items-center justify-center text-[15px] font-bold text-slate-500 whitespace-nowrap border-r border-slate-100 relative z-10 pointer-events-none">
          {project.start_date || '-'}
        </div>
        <div className="col-span-1 px-2 py-0.5 flex flex-col items-center justify-center border-r border-slate-100 overflow-hidden relative z-10 pointer-events-none">
            {isProjectEnded ? (
               <span className="text-[13px] font-bold text-white bg-emerald-500 px-3 py-1.5 rounded-full whitespace-nowrap shadow-sm">프로젝트 종료</span>
            ) : nextSchedule ? (
                <>
                    <span className={`font-mono text-[15px] font-bold ${nextSchedule.isOverdue ? 'text-red-500 animate-pulse' : 'text-emerald-500'}`}>
                        {nextSchedule.date}
                    </span>
                    <span className={`text-[11px] truncate w-full text-center px-1 ${nextSchedule.isOverdue ? 'text-red-500' : 'text-emerald-500'}`} title={nextSchedule.title}>
                        {nextSchedule.title}
                    </span>
                </>
            ) : (
                <span className="text-xs text-slate-300">-</span>
            )}
        </div>
        <div className={`col-span-1 px-4 py-0.5 flex items-center justify-center text-[15px] font-bold ${isCompleted ? 'text-emerald-500' : 'text-slate-400'} whitespace-nowrap transition-colors duration-500 border-r border-slate-100 relative z-10 pointer-events-none`}>
          {project.end_date || '-'}
        </div>
        <div className="col-span-3 px-6 py-0.5 flex items-center font-black text-black text-[16px] group-hover:translate-x-1 transition-transform border-r border-slate-100 overflow-hidden relative z-10 pointer-events-none">
          <span className="truncate">{project.name}</span>
          {project.is_locked && (
            <div className="w-5 h-5 ml-2 rounded-full bg-red-500 flex items-center justify-center text-white shadow-sm shrink-0">
              <i className="fa-solid fa-lock text-[8px]"></i>
            </div>
          )}
        </div>
        <div className="col-span-2 px-6 py-0.5 flex items-center text-[14px] font-bold text-slate-600 border-r border-slate-100 overflow-hidden relative z-10 pointer-events-none">
          <span className="truncate">{getTeamString(project)}</span>
        </div>
        <div className="col-span-2 px-6 py-0.5 flex items-center justify-end gap-3 ml-auto w-full relative z-10 pointer-events-none">
          <div className="flex items-center justify-end gap-3 w-full">
            <div className="w-5 flex-shrink-0 flex items-center justify-center">
              {isCompleted && (
                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-sm shrink-0">
                  <i className="fa-solid fa-check text-[9px]"></i>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-[80px] h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-50 shadow-inner relative flex items-center">
              <div className={`h-full ${isCompleted ? 'bg-emerald-500' : 'bg-black'} rounded-full transition-all duration-500`} style={{ width: `${project.status}%` }}></div>
            </div>
            <div className="flex items-center gap-2 min-w-[55px] justify-end shrink-0">
              <span className={`text-xl font-black ${isCompleted ? 'text-emerald-500' : 'text-black'} text-right transition-colors duration-500`}>{project.status}%</span>
            </div>
          </div>
        </div>

        {/* Desktop Delete Button: Positioned outside the frame to the right */}
        {(['mondo.kim@gmail.com', 'wjatnsdl527@gmail.com'].includes(currentEmail || '')) && (
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity z-20">
            <button
              onClick={handleDeleteClick}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-lg border-2 ${isConfirmingDelete
                ? 'bg-red-500 border-red-600 text-white animate-pulse'
                : 'bg-white border-slate-200 text-slate-400 hover:border-red-400 hover:text-red-500 hover:scale-110'
                }`}
              title={isConfirmingDelete ? "정말 삭제할까요?" : "프로젝트 삭제"}
            >
              <i className={`fa-solid ${isConfirmingDelete ? 'fa-xmark' : 'fa-minus'} text-[12px]`}></i>
            </button>
          </div>
        )}
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden flex flex-col p-4 border-b border-slate-100 bg-white hover:bg-slate-50 transition-colors relative block">
        <a 
          href={`?project=${project.id}`}
          onClick={handleRowClick}
          className="absolute inset-0 z-0 block"
        ></a>

        <div className="flex justify-between items-start mb-1.5 relative z-10 pointer-events-none">
          <span className="text-[11px] font-black text-slate-300">NO. {String(index + 1).padStart(2, '0')}</span>
          <div className="flex flex-col items-end">
            <span className="text-[12px] font-bold text-slate-400">S: {project.start_date || '-'}</span>
            {nextSchedule && <span className={`text-[11px] font-bold ${nextSchedule.isOverdue ? 'text-red-500' : 'text-blue-500'} mt-0.5`}>Next: {nextSchedule.date}</span>}
            {project.end_date && <span className={`text-[11px] font-bold ${isCompleted ? 'text-emerald-500' : 'text-slate-300'} transition-colors duration-500`}>E: {project.end_date}</span>}
          </div>
        </div>
        <h3 className="text-lg font-black text-black mb-1 flex items-center gap-2 relative z-10 pointer-events-none">
          <span className="truncate">{project.name}</span>
          {project.is_locked && (
            <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white shrink-0">
              <i className="fa-solid fa-lock text-[8px]"></i>
            </div>
          )}
          {isCompleted && (
            <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
              <i className="fa-solid fa-check text-[8px]"></i>
            </div>
          )}
        </h3>
        <p className="text-sm font-bold text-slate-500 mb-3 line-clamp-1 text-[13px] relative z-10 pointer-events-none">{getTeamString(project)}</p>

        <div className="flex items-center gap-4 relative z-10 pointer-events-none">
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-50 relative flex items-center">
            <div className={`h-full ${isCompleted ? 'bg-emerald-500' : 'bg-black'} rounded-full transition-colors duration-500`} style={{ width: `${project.status}%` }}></div>
          </div>
          <span className={`text-lg font-black ${isCompleted ? 'text-emerald-500' : 'text-black'} whitespace-nowrap transition-colors duration-500`}>{project.status}%</span>
        </div>

        {(['mondo.kim@gmail.com', 'wjatnsdl527@gmail.com'].includes(currentEmail || '')) && (
          <button
            onClick={handleDeleteClick}
            className={`absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-sm border ${isConfirmingDelete
              ? 'bg-red-500 border-red-600 text-white animate-pulse z-20'
              : 'bg-white border-slate-200 text-slate-400'
              }`}
          >
            <i className={`fa-solid ${isConfirmingDelete ? 'fa-xmark' : 'fa-minus'} text-[10px]`}></i>
          </button>
        )}
      </div>
    </>
  );
};

const ProjectList: React.FC<ProjectListProps> = ({ projects, user = { id: 'guest', userId: 'guest', name: 'Guest', avatarUrl: '' } as User, onSelectProject, onNewProject, onManageTeam, onDeleteProject, onLogout, onLogin, isLoading, deletedProjects, onRestoreProject }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent_created');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [showDeletedDataModal, setShowDeletedDataModal] = useState(false);

  useEffect(() => {
    const closeMenu = () => setProfileMenuOpen(false);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const sortedAndFilteredProjects = useMemo(() => {
    let result = projects.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.pm_name && p.pm_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.designer_name && p.designer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.designer_2_name && p.designer_2_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.designer_3_name && p.designer_3_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return result.sort((a, b) => {
      if (sortBy === 'recent_created') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'progress') {
        return b.status - a.status;
      } else if (sortBy === 'recent_ended') {
        const dateA = a.end_date || '00-00-00';
        const dateB = b.end_date || '00-00-00';
        return dateB.localeCompare(dateA);
      }
      return 0;
    });
  }, [projects, searchTerm, sortBy]);

  const exportToCSV = () => {
    const headers = ["No", "카테고리", "시작일", "종료일", "클라이언트 / 프로젝트명", "진행 인원", "Status", "Last Updated"];
    const rows = sortedAndFilteredProjects.map((p, i) => [
      i + 1,
      p.template_name || '-',
      p.start_date || '-',
      p.end_date || '-',
      p.name,
      getTeamString(p),
      `${p.status}%`,
      new Date(p.last_updated).toLocaleDateString()
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `grafy_projects_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTeamString = (p: Project) => {
    const members = [p.pm_name, p.designer_name, p.designer_2_name, p.designer_3_name].filter(Boolean);
    return members.join(', ');
  };

  return (
    <div className="max-w-[2100px] mx-auto px-4 md:px-6 py-6 md:py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 md:mb-8">
        <div className="flex items-baseline gap-2">
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter uppercase text-black">GRAFY Project Airport</h1>
          <span className="text-[15px] md:text-[18px] text-slate-400 font-normal lowercase">Ver 1.0</span>
        </div>
        <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto py-1 pr-1 overflow-visible">
          <div className="flex items-center gap-2 md:gap-4 overflow-x-auto no-scrollbar scroll-smooth flex-1 md:flex-initial">
            {['mondo.kim@gmail.com', 'wjatnsdl527@gmail.com'].includes(user.email || '') && (
              <button
                onClick={onManageTeam}
                className="shrink-0 bg-white border-2 border-slate-100 text-slate-700 px-4 py-2 md:px-5 md:py-2.5 rounded-xl text-xs md:text-sm font-bold hover:border-black transition-all flex items-center gap-2"
              >
                <i className="fa-solid fa-users text-blue-600"></i>
                <span className="whitespace-nowrap">팀 멤버 관리</span>
              </button>
            )}
            <button
              onClick={exportToCSV}
              className="shrink-0 bg-white border-2 border-slate-100 text-slate-700 px-4 py-2 md:px-5 md:py-2.5 rounded-xl text-xs md:text-sm font-bold hover:border-black transition-all flex items-center gap-2"
            >
              <i className="fa-solid fa-file-excel text-emerald-600"></i><span className="whitespace-nowrap">엑셀 변환</span>
            </button>
          </div>

          <div className="relative ml-2 shrink-0">
            {user.userId === 'guest' ? (
              <button
                onClick={(e) => { e.stopPropagation(); onLogin(); }}
                className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-slate-100 rounded-xl hover:border-black transition-all shadow-sm group"
              >
                <img src="https://www.gstatic.com/images/branding/product/1x/googleg_48dp.png" alt="Google" className="w-4 h-4" />
                <span className="text-[13px] font-bold text-slate-700">Login</span>
              </button>
            ) : (
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setProfileMenuOpen(!profileMenuOpen); }}
                  className="w-10 h-10 md:w-11 md:h-11 rounded-full border-2 border-white shadow-[0_4px_12px_rgba(0,0,0,0.15)] overflow-hidden bg-slate-200 hover:scale-105 transition-all flex-shrink-0"
                >
                  <img
                    src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`}
                    alt={user.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`;
                    }}
                  />
                </button>

                {profileMenuOpen && (
                  <div className="absolute right-0 top-12 w-[220px] bg-white border border-slate-200 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100" onClick={(e) => e.stopPropagation()}>
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">내 정보</p>
                      <div className="flex items-center gap-2">
                        <p className="text-[14px] font-bold text-black">{user.name}</p>
                        {['mondo.kim@gmail.com', 'wjatnsdl527@gmail.com'].includes(user.email || '') && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 bg-black text-white rounded uppercase tracking-wider">ADMIN</span>
                        )}
                      </div>
                    </div>
                    <div className="py-1">
                      {['mondo.kim@gmail.com', 'wjatnsdl527@gmail.com'].includes(user.email || '') && (
                        <button
                          onClick={() => {
                            setProfileMenuOpen(false);
                            setShowDeletedDataModal(true);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors flex items-center gap-3 text-slate-700"
                        >
                          <i className="fa-solid fa-trash-arrow-up text-sm text-amber-600"></i>
                          <span className="text-[13px] font-bold">삭제 데이터 관리</span>
                        </button>
                      )}
                      <button
                        onClick={onLogout}
                        className="w-full text-left px-4 py-2 hover:bg-red-50 transition-colors flex items-center gap-3 text-red-500"
                      >
                        <i className="fa-solid fa-arrow-right-from-bracket text-sm"></i>
                        <span className="text-[13px] font-bold">로그아웃</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-6">
        <div className="flex bg-slate-100 p-1 rounded-xl md:rounded-2xl border border-slate-200 w-full lg:w-auto overflow-x-auto no-scrollbar h-[56px] items-stretch">
          <button
            onClick={() => setSortBy('recent_created')}
            className={`flex-1 px-4 md:px-6 py-2 rounded-lg md:rounded-l-xl md:rounded-r-none text-sm md:text-base font-black transition-all whitespace-nowrap border-r border-slate-200 last:border-r-0 h-full ${sortBy === 'recent_created' ? 'bg-white text-black shadow-sm' : 'text-slate-500 hover:text-black'}`}
          >
            최근등록순
          </button>
          <button
            onClick={() => setSortBy('name')}
            className={`flex-1 px-4 md:px-6 py-2 rounded-lg md:rounded-none text-sm md:text-base font-black transition-all whitespace-nowrap border-r border-slate-200 last:border-r-0 h-full ${sortBy === 'name' ? 'bg-white text-black shadow-sm' : 'text-slate-500 hover:text-black'}`}
          >
            프로젝트명순
          </button>
          <button
            onClick={() => setSortBy('progress')}
            className={`flex-1 px-4 md:px-6 py-2 rounded-lg md:rounded-none text-sm md:text-base font-black transition-all whitespace-nowrap border-r border-slate-200 last:border-r-0 h-full ${sortBy === 'progress' ? 'bg-white text-black shadow-sm' : 'text-slate-500 hover:text-black'}`}
          >
            진행율높은순
          </button>
          <button
            onClick={() => setSortBy('recent_ended')}
            className={`flex-1 px-4 md:px-6 py-2 rounded-lg md:rounded-r-xl md:rounded-l-none text-sm md:text-base font-black transition-all whitespace-nowrap border-r border-slate-200 last:border-r-0 h-full ${sortBy === 'recent_ended' ? 'bg-white text-black shadow-sm' : 'text-slate-500 hover:text-black'}`}
          >
            최근종료일순
          </button>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4 w-full lg:w-auto">
          <div className="relative w-full md:w-[300px] lg:w-[400px]">
            <i className="fa-solid fa-magnifying-glass absolute left-4 md:left-5 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input
              type="text"
              placeholder="검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border-2 border-slate-100 rounded-xl h-[56px] pl-12 md:pl-14 pr-4 md:pr-6 text-sm md:text-base font-bold text-black outline-none focus:border-black transition-all shadow-sm"
            />
          </div>
          <button
            onClick={onNewProject}
            className="w-full md:w-auto bg-black text-white px-6 md:px-8 h-[56px] rounded-xl text-sm md:text-base font-black hover:bg-slate-800 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3"
          >
            <i className="fa-solid fa-plus"></i>프로젝트 생성
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20 text-black">
          <i className="fa-solid fa-circle-notch fa-spin text-4xl md:text-5xl"></i>
        </div>
      ) : (
        <div className="bg-white rounded-[1rem] md:rounded-[1.25rem] shadow-xl shadow-black/5 border border-slate-100">
          {/* Desktop Header */}
          <div className="hidden md:grid grid-cols-12 bg-black text-[13px] md:text-[14px] font-black text-white uppercase tracking-widest text-center rounded-t-[1rem] md:rounded-t-[1.25rem]">
            <div className="col-span-1 py-1.5 border-r border-white/20">No.</div>
            <div className="col-span-1 py-1.5 border-r border-white/20">카테고리</div>
            <div className="col-span-1 py-1.5 border-r border-white/20">시작일</div>
            <div className="col-span-1 py-1.5 border-r border-white/20 text-emerald-300">다음 일정</div>
            <div className="col-span-1 py-1.5 border-r border-white/20">종료일</div>
            <div className="col-span-3 py-1.5 border-r border-white/20 px-6 text-left">클라이언트 / 프로젝트명</div>
            <div className="col-span-2 py-1.5 border-r border-white/20 px-6 text-left">진행 인원</div>
            <div className="col-span-2 py-1.5">진행율</div>
          </div>

          {sortedAndFilteredProjects.length === 0 ? (
            <div className="p-16 md:p-24 text-center flex flex-col items-center gap-4 md:gap-6">
              <i className="fa-solid fa-folder-open text-5xl md:text-7xl text-slate-100"></i>
              <p className="text-slate-400 font-bold text-lg md:text-xl">결과가 없습니다.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {sortedAndFilteredProjects.map((project, index) => (
                <ProjectRowItem
                  key={project.id}
                  project={project}
                  index={index}
                  total={sortedAndFilteredProjects.length}
                  onSelectProject={onSelectProject}
                  onDeleteProject={onDeleteProject}
                  getTeamString={getTeamString}
                  currentEmail={user.email}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {showDeletedDataModal && (
        <DeletedDataModal
          onClose={() => setShowDeletedDataModal(false)}
          onRestore={(projectId) => {
            onRestoreProject(projectId);
            setShowDeletedDataModal(false);
          }}
          deletedProjects={deletedProjects}
        />
      )}
    </div>
  );
};

export default ProjectList;