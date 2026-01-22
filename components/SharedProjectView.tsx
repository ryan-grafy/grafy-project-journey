import React, { useState, useEffect } from 'react';
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

    useEffect(() => {
        const fetchProject = async () => {
            if (!supabase) {
                console.error("Supabase client not initialized");
                setError("시스템 설정 오류: 데이터베이스 연결 불가");
                setLoading(false);
                return;
            }

            try {
                // Fetch project by ID. Note: RLS must allow this for anon/public or use a secure edge function.
                // Assuming 'projects' table is publicly readable for now or specific RLS policies allow reading by ID.
                const { data, error } = await supabase
                    .from('projects')
                    .select('*')
                    .eq('id', projectId)
                    .single();

                if (error) throw error;
                if (!data) throw new Error('Project not found');

                setProject(data);
            } catch (err: any) {
                console.error('Error fetching shared project:', err);
                setError('프로젝트를 불러올 수 없습니다. 올바른 링크인지 확인해주세요.');
            } finally {
                setLoading(false);
            }
        };

        fetchProject();
    }, [projectId]);

    const getVisibleTasks = (stepId: number, project: Project) => {
        // Only show tasks that are in the client_visible_tasks list
        const visibleSet = new Set(project.client_visible_tasks || []);
        const stepCustomTasks = project.custom_tasks?.[stepId] || [];
        let allTasks: Task[] = [];

        // Helper to check visibility
        const isVisible = (taskId: string) => visibleSet.has(taskId);

        if (stepId === 3) {
            // Step 3 Logic (Simplified for read-only)
            const roundCount = project.rounds_count || 2;
            const baseTask = STEPS_STATIC[2].tasks[0];
            const finalTask = STEPS_STATIC[2].tasks[1];

            if (isVisible('t3-base-1')) allTasks.push(stepCustomTasks.find(t => t.id === 't3-base-1') || baseTask);

            for (let r = 1; r <= roundCount; r++) {
                const pmId = `t3-round-${r}-pm`;
                const desId = `t3-round-${r}-des`;
                if (isVisible(pmId)) allTasks.push(stepCustomTasks.find(t => t.id === pmId) || { id: pmId, roles: [Role.PM], title: `${r}차 피드백 수급` } as Task);
                if (isVisible(desId)) allTasks.push(stepCustomTasks.find(t => t.id === desId) || { id: desId, roles: [Role.DESIGNER], title: `${r}차 수정 및 업데이트` } as Task);
            }

            if (isVisible('t3-final')) allTasks.push(stepCustomTasks.find(t => t.id === 't3-final') || finalTask);

        } else {
            // Standard Steps
            const stepStaticTasks = STEPS_STATIC.find(s => s.id === stepId)?.tasks || [];
            allTasks = stepStaticTasks.filter(t => isVisible(t.id)).map(st => stepCustomTasks.find(ct => ct.id === st.id) || st);
            const onlyCustoms = stepCustomTasks.filter(ct => isVisible(ct.id) && !stepStaticTasks.some(st => st.id === ct.id));
            allTasks = [...allTasks, ...onlyCustoms];
        }

        // Sort logic
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
        let allTasks: Task[] = [];

        if (stepId === 3) {
            const roundCount = project.rounds_count || 2;
            const baseTask = STEPS_STATIC[2].tasks[0];
            const finalTask = STEPS_STATIC[2].tasks[1];

            if (!deletedSet.has('t3-base-1')) allTasks.push(stepCustomTasks.find(t => t.id === 't3-base-1') || baseTask);
            for (let r = 1; r <= roundCount; r++) {
                const pmId = `t3-round-${r}-pm`;
                const desId = `t3-round-${r}-des`;
                if (!deletedSet.has(pmId)) allTasks.push(stepCustomTasks.find(t => t.id === pmId) || { id: pmId, roles: [Role.PM], title: `${r}차 피드백 수급` } as Task);
                if (!deletedSet.has(desId)) allTasks.push(stepCustomTasks.find(t => t.id === desId) || { id: desId, roles: [Role.DESIGNER], title: `${r}차 수정 및 업데이트` } as Task);
            }
            if (!deletedSet.has('t3-final')) allTasks.push(stepCustomTasks.find(t => t.id === 't3-final') || finalTask);
            
             // Add only-custom tasks
             const onlyCustoms = stepCustomTasks.filter(ct => !['t3-base-1', 't3-final'].includes(ct.id) && !ct.id.includes('-round-'));
             allTasks = [...allTasks, ...onlyCustoms];

        } else {
             const stepStaticTasks = STEPS_STATIC.find(s => s.id === stepId)?.tasks || [];
             allTasks = stepStaticTasks.filter(st => !deletedSet.has(st.id)).map(st => stepCustomTasks.find(ct => ct.id === st.id) || st);
             const onlyCustoms = stepCustomTasks.filter(ct => !stepStaticTasks.some(st => st.id === ct.id));
             allTasks = [...allTasks, ...onlyCustoms];
        }
        return allTasks;
    };

    const isLockedStep = (stepId: number): boolean => {
        if (stepId === 1) return false;
        
        // 1. Check Real Project Progress (Previous Step Complete?)
        const prevStepId = stepId - 1;
        const prevAllTasks = getAllProjectTasks(prevStepId);
        // If previous step has tasks and ANY is not complete, current is locked
        if (!prevAllTasks.every(t => completedTasks.has(t.id))) return true;

        // 2. Visual Lock for Empty Client Steps
        // If the client has no tasks to see in this step, show it as gray (locked style) for better aesthetics
        const currentClientTasks = getVisibleTasks(stepId, project);
        if (currentClientTasks.length === 0) return true;

        return false;
    };

    return (
        <div className="min-h-screen pb-20 bg-[#e3e7ed] selection:bg-black selection:text-white">
            {/* Read-Only Navbar */}
            <nav className="w-full bg-white border-b border-slate-200 py-4 sticky top-0 z-40 shadow-sm">
                <div className="max-w-[1900px] mx-auto px-6 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <span className="bg-black text-white text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-widest">Client View</span>
                        <h1 className="text-2xl font-black text-black uppercase tracking-tight">{project.name}</h1>
                    </div>
                    <div className="text-sm font-bold text-slate-500">
                        {project.start_date ? `Start: ${project.start_date}` : ''}
                    </div>
                </div>
            </nav>

            <main className="w-full px-4 md:px-6 py-10 max-w-[1900px] mx-auto">
                <div className="max-w-[1900px] mx-auto">
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
                            {STEPS_STATIC.map((step) => {
                                const tasks = getVisibleTasks(step.id, project);
                                const locked = isLockedStep(step.id);
                                return (
                                    <StepColumn
                                        key={step.id}
                                        step={step}
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
