import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Project, Role, Task } from '../types';
import { supabase } from '../supabaseClient';
import StepColumn from './StepColumn';
import { STEPS_STATIC } from '../constants';

interface SharedProjectViewProps {
    projectId: string;
}

const SharedProjectView: React.FC<SharedProjectViewProps> = ({ projectId }) => {
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [contactPopover, setContactPopover] = useState<{ isOpen: boolean; memberName: string; phone?: string; email?: string; x: number; y: number }>({ isOpen: false, memberName: '', x: 0, y: 0 });
    const navRef = useRef<HTMLElement>(null);

    // Click Outside Handler
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (navRef.current && navRef.current.contains(event.target as Node)) {
                return;
            }
            setContactPopover(prev => ({ ...prev, isOpen: false }));
        };
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    // Fetch project data from Supabase
    const fetchProject = useCallback(async () => {
        // console.log('[Client View] Fetching project data...', new Date().toLocaleTimeString());
        if (!supabase) {
            console.error("Supabase client not initialized");
            setError("시스템 설정 오류: 데이터베이스 연결 불가");
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .eq('id', projectId)
                .single();

            if (error) throw error;
            if (!data) throw new Error('Project not found');

            // Metadata Fallback Logic:
            // Ensure we use the latest data even if top-level columns are not yet synced but meta is.
            // Priority: Top-level Column > Meta Backup > Default
            const meta = data.task_states?.meta;
            const normalizedProject = {
                ...data,
                client_visible_tasks: (data.client_visible_tasks && data.client_visible_tasks.length > 0) ? data.client_visible_tasks : (meta?.client_visible_tasks || []),
                
                // Real-time Worker Info Fallback (Meta priority if standard columns lag or missing)
                // Real-time Worker Info Fallback (Meta priority if standard columns lag or missing)
                pm_name: meta?.pm_name || data.pm_name,
                pm_phone: meta?.pm_phone || data.pm_phone,
                pm_email: meta?.pm_email || data.pm_email,
                designer_name: meta?.designer_name || data.designer_name,
                designer_phone: meta?.designer_phone || data.designer_phone,
                designer_email: meta?.designer_email || data.designer_email,
                designer_2_name: meta?.designer_2_name || data.designer_2_name,
                designer_2_phone: meta?.designer_2_phone || data.designer_2_phone,
                designer_2_email: meta?.designer_2_email || data.designer_2_email,
                designer_3_name: meta?.designer_3_name || data.designer_3_name,
                designer_3_phone: meta?.designer_3_phone || data.designer_3_phone,
                designer_3_email: meta?.designer_3_email || data.designer_3_email,

                // Checks if custom_tasks is populated, otherwise fallback to meta
                custom_tasks: (data.custom_tasks && Object.keys(data.custom_tasks).length > 0) ? data.custom_tasks : (meta?.custom_tasks || {}),
                task_order: (data.task_order && Object.keys(data.task_order).length > 0) ? data.task_order : (meta?.task_order || {}),
                deleted_tasks: (data.deleted_tasks && data.deleted_tasks.length > 0) ? data.deleted_tasks : (meta?.deleted_tasks || []),
                rounds_count: data.rounds_count ?? meta?.rounds_count ?? 2,
                rounds2_count: data.rounds2_count ?? meta?.rounds2_count ?? 2,
                rounds_navigation_count: data.rounds_navigation_count ?? meta?.rounds_navigation_count ?? 2,
                template_name: data.template_name || meta?.template_name
            };

            console.log('[Client View] Worker Info Received:', {
                pm_name_meta: meta?.pm_name,
                pm_name_data: data.pm_name,
                pm_name_final: normalizedProject.pm_name,
                designer_name_meta: meta?.designer_name,
                designer_name_data: data.designer_name,
                designer_name_final: normalizedProject.designer_name,
                last_updated: data.last_updated
            });

            // console.log('[Client View] Project data updated:', data.status + '%');
            setProject(normalizedProject);
            setLoading(false);
        } catch (err: any) {
            console.error('Error fetching shared project:', err);
            setError('프로젝트를 불러올 수 없습니다. 올바른 링크인지 확인해주세요.');
            setLoading(false);
        }
    }, [projectId]);

    // Initial fetch
    useEffect(() => {
        fetchProject();
    }, [fetchProject]);

    // Realtime Subscription
    useEffect(() => {
        // console.log('[Client View] Setting up Realtime Subscription');
        const channel = supabase
            .channel(`public:projects:id=eq.${projectId}`)
            .on('postgres_changes', 
                { event: 'UPDATE', schema: 'public', table: 'projects', filter: `id=eq.${projectId}` }, 
                (payload) => {
                    console.log('[Client View] Realtime Update Received');
                    fetchProject();
                }
            )
            .subscribe();

        return () => {
            // console.log('[Client View] Cleaning up subscription');
            supabase.removeChannel(channel);
        };
    }, [projectId, fetchProject]);

    // Polling Fallback: Refresh every 3 seconds to ensure data is synced even if Realtime fails
    useEffect(() => {
        const interval = setInterval(() => {
            fetchProject();
        }, 3000);
        return () => clearInterval(interval);
    }, [fetchProject]);

    const getVisibleTasks = (stepId: number, project: Project) => {
        // Only show tasks that are in the client_visible_tasks list
        const visibleSet = new Set(project.client_visible_tasks || []);
        const deletedSet = new Set(project.deleted_tasks || []);
        const stepCustomTasks = project.custom_tasks?.[stepId] || [];
        
        // 1. Generate Base Tasks (Dynamic + Static)
        let generatedTasks: Task[] = [];

        if (stepId === 2) { // Step 2: Navigation
            const roundCount = project.rounds_navigation_count || 1;
            for (let r = 1; r <= roundCount; r++) {
                generatedTasks.push({ id: `t2-round-${r}-prop`, title: `${r}차 제안`, completed_date: '00-00-00', roles: [Role.PM, Role.DESIGNER] });
                generatedTasks.push({ id: `t2-round-${r}-feed`, title: `${r}차 피드백`, completed_date: '00-00-00', roles: [Role.CLIENT, Role.PM] });
            }
        } else if (stepId === 3) { // Step 3: Expedition 1
            const roundCount = project.rounds_count || 2;
            generatedTasks.push(STEPS_STATIC[2].tasks[0]); // Base 1
            
            for (let r = 1; r <= roundCount; r++) {
                generatedTasks.push({ id: `t3-round-${r}-pm`, title: `${r}차 피드백 수급`, completed_date: '00-00-00', roles: [Role.PM] });
                generatedTasks.push({ id: `t3-round-${r}-des`, title: `${r}차 수정`, completed_date: '00-00-00', roles: [Role.DESIGNER] });
            }
            generatedTasks.push(STEPS_STATIC[2].tasks[1]); // Final
        } else if (stepId === 4) { // Step 4: Expedition 2
            const roundCount = project.rounds2_count || 2;
            for (let r = 1; r <= roundCount; r++) {
                generatedTasks.push({ id: `t4-round-${r}-pm`, title: `${r}차 피드백 수급`, completed_date: '00-00-00', roles: [Role.PM] });
                generatedTasks.push({ id: `t4-round-${r}-des`, title: `${r}차 수정`, completed_date: '00-00-00', roles: [Role.DESIGNER] });
            }
        } else { // Standard Steps
            generatedTasks = STEPS_STATIC.find(s => s.id === stepId)?.tasks || [];
        }

        // 2. Merge Custom Tasks (Override info)
        generatedTasks = generatedTasks.map(t => stepCustomTasks.find(ct => ct.id === t.id) || t);

        // 3. Add Pure Custom Tasks (Added manually via "Checklist Add")
        const pureCustoms = stepCustomTasks.filter(ct => !generatedTasks.some(gt => gt.id === ct.id));
        let allTasks = [...generatedTasks, ...pureCustoms];

        // 4. Filter by Visibility & Deleted
        allTasks = allTasks.filter(t => visibleSet.has(t.id) && !deletedSet.has(t.id));

        // 5. Sort logic
        const order = project.task_order?.[stepId];
        if (order && order.length > 0) {
            allTasks.sort((a, b) => {
                const idxA = order.indexOf(a.id);
                const idxB = order.indexOf(b.id);
                const valA = idxA === -1 ? 999 : idxA;
                const valB = idxB === -1 ? 999 : idxB;
                return valA - valB;
            });
        }

        return allTasks;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#e3e7ed]">
                <div className="flex flex-col items-center gap-4">
                    <i className="fa-solid fa-circle-notch fa-spin text-4xl text-black"></i>
                    <p className="text-black font-bold">프로젝트 데이터 로딩 중...</p>
                </div>
            </div>
        );
    }

    if (error || !project) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#e3e7ed]">
                <div className="bg-white p-8 rounded-2xl shadow-xl text-center">
                    <i className="fa-solid fa-triangle-exclamation text-4xl text-red-500 mb-4"></i>
                    <p className="text-black font-bold text-lg mb-2">접근할 수 없음</p>
                    <p className="text-slate-500">{error || '프로젝트 정보를 찾을 수 없습니다.'}</p>
                </div>
            </div>
        );
    }

    // Calculate generic progress for display only
    const status = project.status || 0;

    const completedTasks = new Set(project.task_states?.completed || []);

    // Logic to determine if a step is "visually" locked (grayscale)
    // Logic to get ALL tasks for a step (ignoring client visibility) to determine real project progress
    const getAllProjectTasks = (stepId: number) => {
        const stepCustomTasks = project.custom_tasks?.[stepId] || [];
        const deletedSet = new Set(project.deleted_tasks || []);
        let generatedTasks: Task[] = [];

        if (stepId === 2) { // Step 2: Navigation
            const roundCount = project.rounds_navigation_count || 1;
            for (let r = 1; r <= roundCount; r++) {
                generatedTasks.push({ id: `t2-round-${r}-prop`, title: `${r}차 제안`, completed_date: '00-00-00', roles: [Role.PM, Role.DESIGNER] });
                generatedTasks.push({ id: `t2-round-${r}-feed`, title: `${r}차 피드백`, completed_date: '00-00-00', roles: [Role.CLIENT, Role.PM] });
            }
        } else if (stepId === 3) { // Step 3: Expedition 1
            const roundCount = project.rounds_count || 2;
            generatedTasks.push(STEPS_STATIC[2].tasks[0]); // Base 1
            
            for (let r = 1; r <= roundCount; r++) {
                generatedTasks.push({ id: `t3-round-${r}-pm`, title: `${r}차 피드백 수급`, completed_date: '00-00-00', roles: [Role.PM] });
                generatedTasks.push({ id: `t3-round-${r}-des`, title: `${r}차 수정`, completed_date: '00-00-00', roles: [Role.DESIGNER] });
            }
            generatedTasks.push(STEPS_STATIC[2].tasks[1]); // Final
        } else if (stepId === 4) { // Step 4: Expedition 2
            const roundCount = project.rounds2_count || 2;
            for (let r = 1; r <= roundCount; r++) {
                generatedTasks.push({ id: `t4-round-${r}-pm`, title: `${r}차 피드백 수급`, completed_date: '00-00-00', roles: [Role.PM] });
                generatedTasks.push({ id: `t4-round-${r}-des`, title: `${r}차 수정`, completed_date: '00-00-00', roles: [Role.DESIGNER] });
            }
        } else { // Standard Steps
            generatedTasks = STEPS_STATIC.find(s => s.id === stepId)?.tasks || [];
        }

        // Merge Custom Tasks (Override info)
        generatedTasks = generatedTasks.map(t => stepCustomTasks.find(ct => ct.id === t.id) || t);

        // Add Pure Custom Tasks
        const pureCustoms = stepCustomTasks.filter(ct => !generatedTasks.some(gt => gt.id === ct.id));
        let allTasks = [...generatedTasks, ...pureCustoms];

        // Filter out deleted tasks
        return allTasks.filter(t => !deletedSet.has(t.id));
    };

    const isLockedStep = (stepId: number): boolean => {
        if (stepId === 1) return false;

        // Special handling for Step 5 (Landing) when Expedition 2 is hidden
        const isExpedition2Hidden = project.task_states?.meta?.is_expedition2_hidden;
        
        let prevStepId = stepId - 1;
        if (stepId === 5 && isExpedition2Hidden) {
            prevStepId = 3; // Check Step 3 (Expedition 1) instead
        }

        // Use getAllProjectTasks to check real project progress based on ALL tasks (not just visible ones)
        const prevStepTasks = getAllProjectTasks(prevStepId);
        
        // If previous step has tasks, check if all are completed
        if (prevStepTasks.length > 0) {
            return !prevStepTasks.every(t => completedTasks.has(t.id));
        }
        
        return false;
    };



    const openContactInfo = (e: React.MouseEvent, field: 'pm' | 'designer' | 'designer_2' | 'designer_3') => {
        e.preventDefault();
        e.stopPropagation();

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

    return (
        <div className="min-h-screen pb-20 bg-[#e3e7ed] selection:bg-black selection:text-white">
            {/* Read-Only Navbar */}
            <nav ref={navRef} className="w-full bg-white border-b border-slate-200 py-4 sticky top-0 z-40 shadow-sm">
                <div className="max-w-[2100px] mx-auto px-6 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <span className="bg-black text-white text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-widest">Client View</span>
                        <h1 className="text-2xl font-black text-black uppercase tracking-tight">{project.name}</h1>
                    </div>
                    
                    {/* Team Info Header */}
                    <div className="hidden lg:flex items-center gap-3.5 border-l border-slate-200 pl-4 shrink-0">
                        <div className="flex flex-col">
                            <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">시작일</span>
                            <span className="text-[14px] font-bold text-black">{project.start_date || '-'}</span>
                        </div>
                        <div className="w-[1px] h-3.5 bg-slate-200"></div>
                        <div className="flex flex-col cursor-pointer hover:opacity-70 transition-opacity" onContextMenu={(e) => openContactInfo(e, 'pm')}>
                            <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">PM</span>
                            <span className="text-[14px] font-bold text-black whitespace-nowrap">{project.pm_name || '-'}</span>
                        </div>
                        <div className="w-[1px] h-3.5 bg-slate-200"></div>
                        <div className="flex flex-col cursor-pointer hover:opacity-70 transition-opacity" onContextMenu={(e) => openContactInfo(e, 'designer')}>
                            <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">DESIGNER A</span>
                            <span className="text-[14px] font-bold text-black whitespace-nowrap">{project.designer_name || '-'}</span>
                        </div>
                        <div className="w-[1px] h-3.5 bg-slate-200"></div>
                        <div className="flex flex-col cursor-pointer hover:opacity-70 transition-opacity" onContextMenu={(e) => openContactInfo(e, 'designer_2')}>
                            <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">DESIGNER B</span>
                            <span className="text-[14px] font-bold text-black whitespace-nowrap">{project.designer_2_name || '-'}</span>
                        </div>
                        <div className="w-[1px] h-3.5 bg-slate-200 ml-1"></div>
                        <div className="flex flex-col cursor-pointer hover:opacity-70 transition-opacity" onContextMenu={(e) => openContactInfo(e, 'designer_3')}>
                            <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">DESIGNER C</span>
                            <span className="text-[14px] font-bold text-black whitespace-nowrap">{project.designer_3_name || '-'}</span>
                        </div>
                    </div>
                </div>

                {/* Popover */}
                {contactPopover.isOpen && (
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
                )}
            </nav>

            <main className="w-full px-4 md:px-6 py-10 max-w-[2100px] mx-auto">
                <div className="max-w-[2100px] mx-auto">
                    {/* Progress Section */}
                    <div className="bg-white p-6 md:p-8 rounded-[1.5rem] mb-10 flex flex-col md:flex-row items-center gap-10 border border-slate-200 shadow-sm relative overflow-visible">
                        <div className="shrink-0 relative z-10">
                            <span className="text-[24px] font-bold text-black leading-none uppercase tracking-tighter">PROJECT JOURNEY</span>
                        </div>
                        <div className="flex-1 h-4 bg-slate-100 rounded-full relative z-10 border border-slate-200 shadow-inner flex items-center overflow-visible w-full">
                            <div className="bg-black h-full rounded-full transition-all duration-1000 ease-out relative flex items-center" style={{ width: `${status}%` }}>
                                {status >= 0 && (
                                    <div className="absolute right-[-15px] top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 z-50">
                                        <i className="fa-solid fa-plane text-black text-[34px] drop-shadow-md"></i>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="shrink-0 relative z-10 flex items-baseline">
                            <span className="text-[52px] font-bold text-black leading-none tracking-tighter">{status}</span>
                            <span className="text-2xl font-bold text-black/50 ml-1">%</span>
                        </div>
                    </div>

                    {/* Steps Layout - Horizontal Scroll */}
                    <div className="overflow-x-auto pb-8 no-scrollbar scroll-smooth">
                        <div className="flex gap-2 md:gap-4 min-w-max md:min-w-0 md:w-full px-0">
                            {STEPS_STATIC.filter((step) => {
                                // Filter out Expedition 2 if hidden in team view
                                const isHidden = project.task_states?.meta?.is_expedition2_hidden;
                                return !(step.id === 4 && isHidden);
                            }).map((step) => {
                                const tasks = getVisibleTasks(step.id, project);
                                const locked = isLockedStep(step.id);
                                
                                // Apply custom step title if exists
                                const savedTitle = project.task_states?.meta?.step_titles?.[step.id];
                                const displayStep = savedTitle ? { ...step, title: savedTitle } : step;

                                // Create unique key that changes when task completion changes
                                const completedTasksList = Array.from(completedTasks).sort().join(',');
                                const uniqueKey = `${step.id}-${completedTasksList}`;
                                
                                return (
                                    <StepColumn
                                        key={uniqueKey}
                                        step={displayStep}
                                        tasks={tasks}
                                        isLocked={locked} // Dynamic locking for visuals
                                        filter={Role.ALL}
                                        completedTasks={new Set(project.task_states?.completed || [])}
                                        taskLinks={new Map(Object.entries(project.task_states?.links || {}))}
                                        onToggleTask={() => { }} // No interaction
                                        onReorder={() => { }}    // No interaction
                                        onDeleteTask={() => { }} // No interaction
                                        onContextMenu={() => { }} // No interaction
                                        onEditContextMenu={() => { }} // No interaction
                                        onToast={() => { }}
                                        isLockedProject={true}
                                        projectId={project.id}
                                        isSnapshotMode={true} // Show snapshot selection
                                        snapshotSelectedTasks={new Set(project.client_visible_tasks || [])}
                                        onSnapshotTaskSelect={() => { }}
                                        onAddTask={() => { }}
                                        isClientView={true}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default SharedProjectView;
