import React, { useState, useMemo, useEffect } from 'react';
import { Project, User } from '../types';

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
}

type SortOption = 'recent_created' | 'name' | 'progress' | 'recent_ended';

interface ProjectRowItemProps {
  project: Project;
  index: number;
  total: number;
  onSelectProject: (p: Project) => void;
  onDeleteProject: (id: string) => void;
  getTeamString: (p: Project) => string;
}

const ProjectRowItem: React.FC<ProjectRowItemProps> = ({
  project,
  index,
  total,
  onSelectProject,
  onDeleteProject,
  getTeamString
}) => {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useEffect(() => {
    if (isConfirmingDelete) {
      const timer = setTimeout(() => setIsConfirmingDelete(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isConfirmingDelete]);

  const handleDeleteClick = (e: React.MouseEvent) => {
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

  return (
    <>
      {/* Desktop Row View */}
      <div
        onClick={() => onSelectProject(project)}
        className={`hidden md:grid grid-cols-12 border-b border-slate-100 hover:bg-slate-50/50 cursor-pointer transition-all items-stretch group relative ${isLast ? 'rounded-b-[1rem] md:rounded-b-[1.25rem] border-b-0' : ''}`}
      >
        <div className="col-span-1 px-4 py-2.5 flex items-center justify-center text-slate-300 font-black text-xl group-hover:text-black transition-colors border-r border-slate-100">
          {String(index + 1).padStart(2, '0')}
        </div>
        <div className="col-span-1 px-4 py-2.5 flex items-center justify-center text-[16px] font-bold text-slate-500 whitespace-nowrap border-r border-slate-100">
          {project.start_date || '-'}
        </div>
        <div className={`col-span-1 px-4 py-2.5 flex items-center justify-center text-[16px] font-bold ${isCompleted ? 'text-emerald-500' : 'text-slate-400'} whitespace-nowrap transition-colors duration-500 border-r border-slate-100`}>
          {project.end_date || '-'}
        </div>
        <div className="col-span-4 px-6 py-2.5 flex items-center font-black text-black text-[16px] group-hover:translate-x-1 transition-transform border-r border-slate-100 overflow-hidden">
          <span className="truncate">{project.name}</span>
          {project.is_locked && (
            <div className="w-5 h-5 ml-2 rounded-full bg-red-500 flex items-center justify-center text-white shadow-sm shrink-0">
              <i className="fa-solid fa-lock text-[8px]"></i>
            </div>
          )}
        </div>
        <div className="col-span-3 px-6 py-2.5 flex items-center text-[14px] font-bold text-slate-600 border-r border-slate-100 overflow-hidden">
          <span className="truncate">{getTeamString(project)}</span>
        </div>
        <div className="col-span-2 px-6 py-2.5 flex items-center justify-end gap-3 ml-auto w-full">
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
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
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
      </div>

      {/* Mobile Card View */}
      <div
        onClick={() => onSelectProject(project)}
        className="md:hidden flex flex-col p-4 border-b border-slate-100 bg-white hover:bg-slate-50 transition-colors cursor-pointer relative"
      >
        <div className="flex justify-between items-start mb-1.5">
          <span className="text-[11px] font-black text-slate-300">NO. {String(index + 1).padStart(2, '0')}</span>
          <div className="flex flex-col items-end">
            <span className="text-[12px] font-bold text-slate-400">S: {project.start_date || '-'}</span>
            {project.end_date && <span className={`text-[11px] font-bold ${isCompleted ? 'text-emerald-500' : 'text-slate-300'} transition-colors duration-500`}>E: {project.end_date}</span>}
          </div>
        </div>
        <h3 className="text-lg font-black text-black mb-1 flex items-center gap-2">
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
        <p className="text-sm font-bold text-slate-500 mb-3 line-clamp-1 text-[13px]">{getTeamString(project)}</p>

        <div className="flex items-center gap-4">
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-50 relative flex items-center">
            <div className={`h-full ${isCompleted ? 'bg-emerald-500' : 'bg-black'} rounded-full transition-colors duration-500`} style={{ width: `${project.status}%` }}></div>
          </div>
          <span className={`text-lg font-black ${isCompleted ? 'text-emerald-500' : 'text-black'} whitespace-nowrap transition-colors duration-500`}>{project.status}%</span>
        </div>

        <button
          onClick={handleDeleteClick}
          className={`absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-sm border ${isConfirmingDelete
            ? 'bg-red-500 border-red-600 text-white animate-pulse z-10'
            : 'bg-white border-slate-200 text-slate-400'
            }`}
        >
          <i className={`fa-solid ${isConfirmingDelete ? 'fa-xmark' : 'fa-minus'} text-[10px]`}></i>
        </button>
      </div>
    </>
  );
};

const ProjectList: React.FC<ProjectListProps> = ({ projects, user = { id: 'guest', userId: 'guest', name: 'Guest', avatarUrl: '' } as User, onSelectProject, onNewProject, onManageTeam, onDeleteProject, onLogout, onLogin, isLoading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent_created');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

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
    const headers = ["No", "시작일", "종료일", "클라이언트 / 프로젝트명", "진행 인원", "Status", "Last Updated"];
    const rows = sortedAndFilteredProjects.map((p, i) => [
      i + 1,
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
    <div className="max-w-[1800px] mx-auto px-4 md:px-6 py-6 md:py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 md:mb-8">
        <div className="flex items-baseline gap-2">
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter uppercase text-black">GRAFY Project Airport</h1>
          <span className="text-[15px] md:text-[18px] text-slate-400 font-normal lowercase">Ver 1.0</span>
        </div>
        <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto py-1 pr-1 overflow-visible">
          <div className="flex items-center gap-2 md:gap-4 overflow-x-auto no-scrollbar scroll-smooth flex-1 md:flex-initial">
            <button
              onClick={onManageTeam}
              className="shrink-0 bg-white border-2 border-slate-100 text-slate-700 px-4 py-2 md:px-5 md:py-2.5 rounded-xl text-xs md:text-sm font-bold hover:border-black transition-all flex items-center gap-2"
            >
              <i className="fa-solid fa-users text-blue-600"></i>
              <span className="whitespace-nowrap">팀 멤버 관리</span>
            </button>
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
                      <p className="text-[14px] font-bold text-black">{user.name}</p>
                    </div>
                    <div className="py-1">
                      <button className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors flex items-center gap-3 text-slate-700">
                        <i className="fa-regular fa-user text-sm"></i>
                        <span className="text-[13px] font-medium">프로필 설정</span>
                      </button>
                    </div>
                    <div className="border-t border-slate-100 mt-1 pt-1">
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
            className={`flex-1 lg:flex-none px-4 md:px-6 py-2 rounded-lg md:rounded-l-xl md:rounded-r-none text-sm md:text-base font-black transition-all whitespace-nowrap border-r border-slate-200 last:border-r-0 h-full ${sortBy === 'recent_created' ? 'bg-white text-black shadow-sm' : 'text-slate-500 hover:text-black'}`}
          >
            최근등록순
          </button>
          <button
            onClick={() => setSortBy('name')}
            className={`flex-1 lg:flex-none px-4 md:px-6 py-2 rounded-lg md:rounded-none text-sm md:text-base font-black transition-all whitespace-nowrap border-r border-slate-200 last:border-r-0 h-full ${sortBy === 'name' ? 'bg-white text-black shadow-sm' : 'text-slate-500 hover:text-black'}`}
          >
            프로젝트명순
          </button>
          <button
            onClick={() => setSortBy('progress')}
            className={`flex-1 lg:flex-none px-4 md:px-6 py-2 rounded-lg md:rounded-none text-sm md:text-base font-black transition-all whitespace-nowrap border-r border-slate-200 last:border-r-0 h-full ${sortBy === 'progress' ? 'bg-white text-black shadow-sm' : 'text-slate-500 hover:text-black'}`}
          >
            진행율높은순
          </button>
          <button
            onClick={() => setSortBy('recent_ended')}
            className={`flex-1 lg:flex-none px-4 md:px-6 py-2 rounded-lg md:rounded-r-xl md:rounded-l-none text-sm md:text-base font-black transition-all whitespace-nowrap border-r border-slate-200 last:border-r-0 h-full ${sortBy === 'recent_ended' ? 'bg-white text-black shadow-sm' : 'text-slate-500 hover:text-black'}`}
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
            <div className="col-span-1 py-3 border-r border-white/20">No.</div>
            <div className="col-span-1 py-3 border-r border-white/20">시작일</div>
            <div className="col-span-1 py-3 border-r border-white/20">종료일</div>
            <div className="col-span-4 py-3 border-r border-white/20 px-6 text-left">클라이언트 / 프로젝트명</div>
            <div className="col-span-3 py-3 border-r border-white/20 px-6 text-left">진행 인원</div>
            <div className="col-span-2 py-3">진행율</div>
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
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectList;