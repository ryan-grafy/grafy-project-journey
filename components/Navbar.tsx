import React, { useState, useEffect, useRef } from 'react';
import { Role, Project, User, TeamMember } from '../types';
import { ADMIN_EMAILS } from '../constants';

interface NavbarProps {
  project: Project;
  user: User;
  teamMembers: TeamMember[];
  activeRole: Role;
  onRoleChange: (role: Role) => void;
  onBack: () => void;
  onUpdateInfo: (updates: Partial<Project>) => void;
  onLogout: () => void;
  onLogin: () => void;
  onToast: (msg: string) => void;
  onToggleLock?: (locked: boolean) => void;
  isSnapshotMode?: boolean;
  onSnapshotToggle?: () => void;
  onSaveTemplate?: () => void;
  onManageDeletedData?: () => void;
  onManageTemplates?: () => void;
  onExportToExcel?: () => void;
  onImportFromExcel?: () => void;
}

const getTemplateBadgeColor = (name: string) => {
  const PALETTE = [
    'bg-[#F2F29D]', // Yellow
    'bg-[#FBCF9D]', // Orange
    'bg-[#ACA379]', // Olive
    'bg-[#F2D5D1]', // Pink
    'bg-[#DEDEF8]', // Lavender
    'bg-[#C4EAE9]', // Mint
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PALETTE.length;
  // Use text-black/60 for good contrast on these lighter colors
  return `${PALETTE[index]} text-black/60`;
};

const Navbar: React.FC<NavbarProps> = ({
  project, user = { id: 'guest', userId: 'guest', name: 'Guest', avatarUrl: '' } as User, teamMembers, activeRole, onRoleChange, onBack, onUpdateInfo, onLogout, onLogin, onToast, onToggleLock,
  isSnapshotMode, onSnapshotToggle, onSaveTemplate, onManageDeletedData, onManageTemplates, onExportToExcel, onImportFromExcel
}) => {
  const [localProjectName, setLocalProjectName] = useState(project.name);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [localDate, setLocalDate] = useState(project.start_date || '');
  const [editMenu, setEditMenu] = useState<{ isOpen: boolean; field: 'pm' | 'designer' | 'designer_2' | 'designer_3' | null; x: number; y: number }>({ isOpen: false, field: null, x: 0, y: 0 });
  const [contactPopover, setContactPopover] = useState<{ isOpen: boolean; memberName: string; phone?: string; email?: string; x: number; y: number }>({ isOpen: false, memberName: '', x: 0, y: 0 });
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const navRef = useRef<HTMLElement>(null); // Ref for the entire Navbar

  useEffect(() => { setLocalProjectName(project.name); }, [project.name]);
  useEffect(() => { setLocalDate(project.start_date || ''); }, [project.start_date]);

  // Click Outside Handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // If click is inside the navbar, do NOT close the menus
      if (navRef.current && navRef.current.contains(event.target as Node)) {
        return;
      }
      setEditMenu(prev => ({ ...prev, isOpen: false }));
      setContactPopover(prev => ({ ...prev, isOpen: false }));
      setProfileMenuOpen(false);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => { if (isEditingTitle) titleInputRef.current?.focus(); }, [isEditingTitle]);
  useEffect(() => { if (isEditingDate) dateInputRef.current?.focus(); }, [isEditingDate]);

  const openSwapMenu = (e: React.MouseEvent, field: 'pm' | 'designer' | 'designer_2' | 'designer_3') => {
    if (project.is_locked) return;
    e.preventDefault();
    e.stopPropagation();
    setContactPopover({ ...contactPopover, isOpen: false });
    setEditMenu({ isOpen: true, field, x: e.clientX, y: e.clientY });
  };

  const openContactInfo = (e: React.MouseEvent, field: 'pm' | 'designer' | 'designer_2' | 'designer_3') => {
    e.preventDefault();
    e.stopPropagation();
    setEditMenu({ ...editMenu, isOpen: false });

    let memberName = '';
    let phone = '';
    let email = '';

    if (field === 'pm') {
      memberName = project.pm_name;
      phone = project.pm_phone || '';
      email = project.pm_email || '';
    } else if (field === 'designer') {
      memberName = project.designer_name;
      phone = project.designer_phone || '';
      email = project.designer_email || '';
    } else if (field === 'designer_2') {
      memberName = project.designer_2_name || '';
      phone = project.designer_2_phone || '';
      email = project.designer_2_email || '';
    } else if (field === 'designer_3') {
      memberName = project.designer_3_name || '';
      phone = project.designer_3_phone || '';
      email = project.designer_3_email || '';
    }

    if (!memberName) return;

    setContactPopover({ isOpen: true, memberName, phone, email, x: e.clientX, y: e.clientY });
  };

  const handleMemberSelect = (member: TeamMember) => {
    const nameWithTitle = `${member.name} ${member.title}`;
    if (editMenu.field === 'pm') {
      onUpdateInfo({ pm_name: nameWithTitle, pm_phone: member.phone, pm_email: member.email });
    } else if (editMenu.field === 'designer') {
      onUpdateInfo({ designer_name: nameWithTitle, designer_phone: member.phone, designer_email: member.email });
    } else if (editMenu.field === 'designer_2') {
      onUpdateInfo({ designer_2_name: nameWithTitle, designer_2_phone: member.phone, designer_2_email: member.email });
    } else if (editMenu.field === 'designer_3') {
      onUpdateInfo({ designer_3_name: nameWithTitle, designer_3_phone: member.phone, designer_3_email: member.email });
    }
    setEditMenu({ isOpen: false, field: null, x: 0, y: 0 });
    onToast("담당자가 변경되었습니다.");
  };

  const handleDateChange = (val: string) => {
    const cleaned = val.replace(/[^0-9]/g, '');
    if (cleaned.length === 6) {
      const formatted = `${cleaned.slice(0, 2)}-${cleaned.slice(2, 4)}-${cleaned.slice(4, 6)}`;
      setLocalDate(formatted);
    } else {
      setLocalDate(val);
    }
  };

  const roles = [
    { label: '전체', value: Role.ALL },
    { label: '클라이언트', value: Role.CLIENT },
    { label: 'PM', value: Role.PM },
    { label: '디자이너', value: Role.DESIGNER },
    { label: '매니저', value: Role.MANAGER },
  ];

  return (
    <nav ref={navRef} className="w-full bg-white border-b border-slate-200 py-3 md:py-4 sticky top-0 z-40 shadow-sm">
      <style>{`
        @keyframes stretch-open {
          0% {
            opacity: 0;
            transform: scale(0);
          }
          60% {
            transform: scale(1.05) translateY(5px);
          }
          80% {
              transform: scale(0.95) translateY(-2px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-stretch-open {
          transform-origin: top right;
          animation: stretch-open 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>
      <div className="max-w-[2200px] mx-auto px-4 md:px-6 flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-center">

        {/* Left Side: Title & Info */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 lg:gap-8 flex-1 min-w-0">
          <div className="flex items-center justify-between lg:justify-start min-w-0 flex-1 relative">
            {isEditingTitle && !project.is_locked ? (
              <input
                ref={titleInputRef}
                type="text"
                value={localProjectName}
                onChange={(e) => setLocalProjectName(e.target.value)}
                onBlur={() => { setIsEditingTitle(false); onUpdateInfo({ name: localProjectName }); }}
                placeholder="프로젝트명을 입력하세요"
                onKeyDown={(e) => e.key === 'Enter' && (titleInputRef.current?.blur())}
                className="text-[22px] md:text-[26px] font-bold text-black border-b-2 border-black outline-none bg-transparent w-full md:w-auto min-w-[200px]"
              />
            ) : (
                <div className="flex items-center gap-2">
                    <span onClick={() => !project.is_locked && setIsEditingTitle(true)} className={`text-[22px] md:text-[26px] font-bold text-black truncate max-w-[200px] md:max-w-none ${!project.is_locked ? 'cursor-pointer hover:opacity-70' : ''}`}>
                        {project.name}
                    </span>
                    {(project.template_name || project.task_states?.meta?.template_name) && (
                        <span className={`px-2 py-0.5 rounded-full text-[12px] font-bold uppercase tracking-wide whitespace-nowrap ${getTemplateBadgeColor(project.template_name || project.task_states?.meta?.template_name || '')}`}>
                            {project.template_name || project.task_states?.meta?.template_name}
                        </span>
                    )}
                    {project.is_locked && <i className="fa-solid fa-lock text-black/30 ml-2 text-base md:text-lg"></i>}
                </div>
            )}
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-3.5 border-l border-slate-200 pl-4 shrink-0 lg:mr-4">
          <div className="flex flex-col">
            <span className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-widest leading-none mb-1">시작일</span>
            {isEditingDate && !project.is_locked ? (
              <input ref={dateInputRef} type="text" maxLength={6} placeholder="YYMMDD" value={localDate.replace(/-/g, '')} onChange={(e) => handleDateChange(e.target.value)} onBlur={() => { setIsEditingDate(false); onUpdateInfo({ start_date: localDate }); }} className="text-[14px] font-semibold text-black border-b border-black outline-none bg-transparent w-14" />
            ) : (
              <span onClick={() => !project.is_locked && setIsEditingDate(true)} className={`text-[14px] font-semibold text-black ${!project.is_locked ? 'cursor-pointer hover:opacity-70 underline decoration-black/20 underline-offset-4' : ''}`}>
                {project.start_date || '-'}
              </span>
            )}
          </div>
          <div className="w-[1px] h-3.5 bg-slate-200"></div>
          <div className="flex flex-col cursor-pointer hover:opacity-70 transition-opacity" onClick={(e) => openSwapMenu(e, 'pm')} onContextMenu={(e) => openContactInfo(e, 'pm')}>
            <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">PM</span>
            <span className="text-[14px] font-bold text-black whitespace-nowrap">{project.pm_name || '-'}</span>
          </div>
          <div className="w-[1px] h-3.5 bg-slate-200"></div>
          <div className="flex flex-col cursor-pointer hover:opacity-70 transition-opacity" onClick={(e) => openSwapMenu(e, 'designer')} onContextMenu={(e) => openContactInfo(e, 'designer')}>
            <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">DESIGNER A</span>
            <span className="text-[14px] font-bold text-black whitespace-nowrap">{project.designer_name || '-'}</span>
          </div>
          <div className="w-[1px] h-3.5 bg-slate-200"></div>
          <div className="flex flex-col cursor-pointer hover:opacity-70 transition-opacity" onClick={(e) => openSwapMenu(e, 'designer_2')} onContextMenu={(e) => openContactInfo(e, 'designer_2')}>
            <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">DESIGNER B</span>
            <span className="text-[14px] font-bold text-black whitespace-nowrap">{project.designer_2_name || '-'}</span>
          </div>
          <div className="w-[1px] h-3.5 bg-slate-200 ml-1"></div>
          <div className="flex flex-col cursor-pointer hover:opacity-70 transition-opacity" onClick={(e) => openSwapMenu(e, 'designer_3')} onContextMenu={(e) => openContactInfo(e, 'designer_3')}>
            <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">DESIGNER C</span>
            <span className="text-[14px] font-bold text-black whitespace-nowrap">{project.designer_3_name || '-'}</span>
          </div>
        </div>


        {/* Right Side: Roles & Actions */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 lg:gap-6 shrink-0 h-auto md:h-[42px]">
          <div className="bg-slate-100 p-1 rounded-lg flex items-center gap-1 border border-slate-200 overflow-x-auto no-scrollbar max-w-full md:max-w-none h-full">
            {roles.map((r) => (
              <button key={r.value} onClick={(e) => { e.stopPropagation(); onRoleChange(r.value); }} className={`px-2.5 py-1 md:px-3 md:py-1.5 h-full flex items-center rounded-md text-[10.5px] md:text-[12.5px] font-semibold transition-all whitespace-nowrap ${activeRole === r.value ? 'bg-black text-white shadow-md' : 'text-slate-500 hover:text-black'}`}>
                {r.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between md:justify-end gap-3 md:gap-4 h-full">
            {project.status === 100 && (
              <button onClick={(e) => { e.stopPropagation(); onToggleLock?.(!project.is_locked); }} className={`flex items-center gap-2 px-3 py-1.5 md:px-5 md:py-2 rounded-xl text-[10px] md:text-[12px] font-bold transition-all shadow-md h-full ${project.is_locked ? 'bg-red-500 text-white' : 'bg-black text-white'}`}>
                <i className={`fa-solid ${project.is_locked ? 'fa-unlock' : 'fa-lock'}`}></i>
                <span className="hidden sm:inline">{project.is_locked ? '잠금 해제' : '최종 완료 잠금'}</span>
                <span className="sm:hidden">{project.is_locked ? '해제' : '잠금'}</span>
              </button>
            )}
            <div className="flex items-center gap-2 md:gap-3 ml-auto h-full">
              {/* Admin Template Save Button */}
              {user.email && ADMIN_EMAILS.includes(user.email) && onSaveTemplate && (
                <button
                  onClick={() => onSaveTemplate()}
                  className="bg-white border border-slate-300 text-slate-600 px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-[11px] md:text-[13px] font-bold shadow-sm hover:border-black hover:text-black transition-all h-full"
                >
                  <i className="fa-solid fa-save mr-1.5"></i> 템플릿 저장
                </button>
              )}

              {/* Share Button (Moved First) */}
              <button
                onClick={async () => {
                  try {
                    // const token = crypto.randomUUID(); // Unused
                    const shareUrl = `${window.location.origin}/share/${project.id}`;
                    await navigator.clipboard.writeText(shareUrl);
                    onToast("클라이언트 공유 링크가 복사되었습니다!");
                  } catch (e) {
                    onToast("링크 복사 실패");
                  }
                }}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 border border-slate-200 hover:bg-black hover:text-white hover:border-black transition-all"
                title="공유 링크 복사"
              >
                <i className="fa-solid fa-share-nodes text-sm"></i>
              </button>

              {/* Snapshot Button (New) */}
              <button
                onClick={onSnapshotToggle}
                className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all ${isSnapshotMode ? 'bg-red-500 text-white border-red-500 animate-pulse' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-black hover:text-white hover:border-black'}`}
                title="클라이언트 스냅샷 모드"
              >
                <i className="fa-solid fa-camera text-sm"></i>
              </button>

              {/* Project List Button (Moved & Styled like others) */}
              {/* Project List Button (Link for New Tab Support) */}
              <a
                href="/"
                onClick={(e) => {
                   // Allow default behavior for modifier keys (New Tab)
                   if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;
                   e.preventDefault();
                   onBack(); 
                }}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 border border-slate-200 hover:bg-black hover:text-white hover:border-black transition-all shrink-0 shadow-sm group flex"
                title="프로젝트 목록으로 돌아가기 (휠 클릭시 새 탭)"
              >
                <i className="fa-solid fa-list-ul text-sm"></i>
              </a>

              <div className="relative h-full flex items-center">
                {user.userId === 'guest' ? (
                  <button
                    onClick={onLogin}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm group"
                  >
                    <img src="https://www.gstatic.com/images/branding/product/1x/googleg_48dp.png" alt="Google" className="w-4 h-4" />
                    <span className="text-[12px] font-bold text-slate-700">Google 로그인</span>
                  </button>
                ) : (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setProfileMenuOpen(prev => !prev); }}
                      className="w-10 h-10 rounded-full border-2 border-white shadow-md overflow-hidden bg-slate-200 hover:scale-105 transition-all flex-shrink-0"
                    >
                      <img
                        src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`}
                        alt={user.name}
                        className="w-full h-full object-cover pointer-events-none"
                      />
                    </button>

                    {profileMenuOpen && (
                      <div className="absolute right-0 top-12 w-[220px] bg-white border border-slate-200 rounded-2xl shadow-2xl py-2 z-50 animate-stretch-open" onClick={(e) => e.stopPropagation()}>
                        <div className="px-4 py-3 border-b border-slate-100">
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">내 정보</p>
                          <div className="flex items-center gap-2">
                             <p className="text-[14px] font-bold text-black">{user.name}</p>
                             {ADMIN_EMAILS.includes(user.email || '') && (
                                <span className="text-[9px] font-black px-1.5 py-0.5 bg-black text-white rounded uppercase tracking-wider">ADMIN</span>
                             )}
                          </div>
                        </div>
                        <div className="py-1">
                          {ADMIN_EMAILS.includes(user.email || '') && (
                             <>
                               {onManageDeletedData && (
                                  <button
                                    onClick={() => { setProfileMenuOpen(false); onManageDeletedData(); }}
                                    className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors flex items-center gap-3 text-slate-700"
                                  >
                                    <i className="fa-solid fa-trash-arrow-up text-sm text-amber-600"></i>
                                    <span className="text-[13px] font-bold">삭제 데이터 관리</span>
                                  </button>
                               )}
                               {onManageTemplates && (
                                  <button
                                    onClick={() => { setProfileMenuOpen(false); onManageTemplates(); }}
                                    className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors flex items-center gap-3 text-slate-700"
                                  >
                                    <i className="fa-solid fa-layer-group text-sm text-purple-600"></i>
                                    <span className="text-[13px] font-bold">템플릿 관리</span>
                                  </button>
                               )}
                             </>
                          )}
                          {onExportToExcel && (
                             <button
                               onClick={() => { setProfileMenuOpen(false); onExportToExcel(); }}
                               className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors flex items-center gap-3 text-slate-700"
                             >
                               <i className="fa-solid fa-file-excel text-sm text-green-600"></i>
                               <span className="text-[13px] font-bold">엑셀 다운로드</span>
                             </button>
                          )}
                          {ADMIN_EMAILS.includes(user.email || '') && onImportFromExcel && (
                             <button
                               onClick={() => { setProfileMenuOpen(false); onImportFromExcel(); }}
                               className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors flex items-center gap-3 text-slate-700"
                             >
                               <i className="fa-solid fa-file-import text-sm text-blue-600"></i>
                               <span className="text-[13px] font-bold">엑셀 임포트</span>
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
        </div>
      </div>

      {/* Popovers */}
      {
        editMenu.isOpen && (
          <div className="fixed z-[110] bg-white border border-slate-200 rounded-xl shadow-2xl p-1.5 w-[200px]" style={{ top: editMenu.y, left: editMenu.x }} onClick={(e) => e.stopPropagation()}>
            <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 mb-1">담당자 교체 선택</div>
            <div className="max-h-60 overflow-y-auto custom-scrollbar">
              {teamMembers.map(m => (
                <button key={m.id} onClick={() => handleMemberSelect(m)} className="w-full text-left px-4 py-2 rounded-lg hover:bg-slate-50 text-[13px] font-bold text-black border-b border-slate-50 last:border-0">{m.name} {m.title}</button>
              ))}
            </div>
          </div>
        )
      }

      {
        contactPopover.isOpen && (
          <div className="fixed z-[110] bg-white text-black border border-slate-200 rounded-2xl shadow-2xl p-6 w-[240px] animate-in fade-in zoom-in-95 duration-100" style={{ top: contactPopover.y, left: contactPopover.x }} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{contactPopover.memberName} INFO</div>
              <button onClick={() => setContactPopover({ ...contactPopover, isOpen: false })} className="text-slate-300 hover:text-black transition-colors"><i className="fa-solid fa-times"></i></button>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <i className="fa-solid fa-phone text-blue-600 text-[12px]"></i>
                <span className="text-[14px] font-bold text-black">{contactPopover.phone || '정보 없음'}</span>
              </div>
              <div className="flex items-center gap-3">
                <i className="fa-solid fa-envelope text-blue-600 text-[12px]"></i>
                <span className="text-[14px] font-bold text-black truncate">{contactPopover.email || '정보 없음'}</span>
              </div>
            </div>
          </div>
        )
      }
    </nav >
  );
};

export default Navbar;
