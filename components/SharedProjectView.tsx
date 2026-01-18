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
            if (!supabase) return;

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
                if (isVisible(pmId)) allTasks.push(stepCustomTasks.find(t => t.id === pmId) || { id: pmId, role: Role.PM, title: `${r}차 피드백 수급` } as Task);
                if (isVisible(desId)) allTasks.push(stepCustomTasks.find(t => t.id === desId) || { id: desId, role: Role.DESIGNER, title: `${r}차 수정 및 업데이트` } as Task);
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

    return (
        <div className="min-h-screen pb-20 bg-[#e3e7ed] selection:bg-black selection:text-white">
            {/* Read-Only Navbar */}
            <nav className="w-full bg-white border-b border-slate-200 py-4 sticky top-0 z-40 shadow-sm">
                <div className="max-w-[1800px] mx-auto px-6 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <span className="bg-black text-white text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-widest">Client View</span>
                        <h1 className="text-2xl font-black text-black uppercase tracking-tight">{project.name}</h1>
                    </div>
                    <div className="text-sm font-bold text-slate-500">
                        {project.start_date ? `Start: ${project.start_date}` : ''}
                    </div>
                </div>
            </nav>

            <main className="w-full px-4 md:px-6 py-10 max-w-[1800px] mx-auto">
                <div className="max-w-[1800px] mx-auto">
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

                    {/* Steps Layout */}
                    <div className="overflow-x-auto pb-8 no-scrollbar scroll-smooth">
                        <div className="flex gap-4 md:gap-8 min-w-max px-0">
                            {STEPS_STATIC.map((step) => {
                                const tasks = getVisibleTasks(step.id, project);
                                // If no tasks are visible in this step, we can consider hiding the column or showing empty state.
                                // For now, we show the column to maintain structure.

                                return (
                                    <StepColumn
                                        key={step.id}
                                        step={step}
                                        tasks={tasks}
                                        isLocked={true} // Always locked for client view
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
                                        isSnapshotMode={false} // Always false
                                        snapshotSelectedTasks={new Set()}
                                        onSnapshotTaskSelect={() => { }}
                                        onAddTask={() => { }}
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
