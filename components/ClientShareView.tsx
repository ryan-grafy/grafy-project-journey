import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import StepColumn from './StepColumn';
import { STEPS_STATIC } from '../constants';
import { Project, Role, Task } from '../types';

const ClientShareView: React.FC = () => {
    const [project, setProject] = useState<Project | null>(null);
    const [teamMembers, setTeamMembers] = useState<any[]>([]);
    const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
    const [taskLinks, setTaskLinks] = useState<Map<string, { url: string, label: string }>>(new Map());
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        const fetchSharedProject = async () => {
            const parts = window.location.pathname.split('/share/');
            const token = parts[1];
            if (!token) {
                setErrorMsg("잘못된 공유 링크입니다.");
                setLoading(false);
                return;
            }

            if (!supabase) return;

            try {
                // 1. Resolve Token to Project ID
                const { data: shareData, error: shareError } = await supabase
                    .from('public_shares')
                    .select('project_id')
                    .eq('token', token)
                    .single();

                if (shareError || !shareData) {
                    setErrorMsg("유효하지 않거나 만료된 링크입니다.");
                    setLoading(false);
                    return;
                }

                const projectId = shareData.project_id;

                // 2. Fetch Project Data
                const { data: projectData, error: projectError } = await supabase
                    .from('projects')
                    .select('*')
                    .eq('id', projectId)
                    .single();

                if (projectError || !projectData) {
                    setErrorMsg("프로젝트 정보를 불러올 수 없습니다.");
                    setLoading(false);
                    return;
                }

                setProject(projectData);

                // 3. Parse Task States (Completed, Links)
                if (projectData.task_states) {
                    const states = projectData.task_states;
                    if (states.completed) setCompletedTasks(new Set(states.completed));
                    if (states.links) {
                        const map = new Map();
                        Object.entries(states.links).forEach(([k, v]) => map.set(k, v));
                        setTaskLinks(map);
                    }
                }

                // 4. Load Team Members (for display names)
                const { data: teamData } = await supabase.from('team_members').select('*');
                if (teamData) setTeamMembers(teamData);

            } catch (e) {
                console.error(e);
                setErrorMsg("데이터 로드 중 오류가 발생했습니다.");
            } finally {
                setLoading(false);
            }
        };

        fetchSharedProject();
    }, []);

    const getVisibleTasks = (stepId: number) => {
        if (!project) return [];

        // Client Visible Logic: Only show tasks in client_visible_tasks array
        // If array is null/empty, maybe show nothing or all? Assuming default is hidden for safety.
        // Or users imply everything is visible unless hidden? 
        // Requirement says "Client Snapshot Link (Selectively exposed)".
        // So we need to filter by `client_visible_tasks`.

        const visibleSet = new Set(project.client_visible_tasks || []);
        const tasks = STEPS_STATIC.find(s => s.id === stepId)?.tasks || [];

        // Filter tasks
        return tasks.filter(t => visibleSet.has(t.id));
    };

    // Helper to handle rounds logic for filtering (simplified recursion/expansion)
    // Actually StepColumn handles expansion, but we need to pass a filtered list of "root" tasks or expanded tasks?
    // StepColumn expects `tasks` prop.
    // We should mimic App.tsx's getVisibleTasks logic but add client filter.

    /* ... Re-implementing getVisibleTasks from App.tsx mostly ... */
    /* For simplicity, let's copy the logic but add visibility filter at the end */

    const getProjectTasks = (stepId: number) => {
        if (!project) return [];
        const step = STEPS_STATIC.find(s => s.id === stepId);
        if (!step) return [];

        let allVisibleTasks: Task[] = [];

        // Base Tasks & Round Logic (Copied from App.tsx)
        const stepTasks = step.tasks;
        if (step.id === 3) {
            const rounds = project.rounds_count || 2;
            const round1Pm = stepTasks.find(t => t.id === 't3-round-1-pm');
            const round1Des = stepTasks.find(t => t.id === 't3-round-1-des');
            const round2Pm = stepTasks.find(t => t.id === 't3-round-2-pm');
            const round2Des = stepTasks.find(t => t.id === 't3-round-2-des');

            if (round1Pm) allVisibleTasks.push(round1Pm);
            if (round1Des) allVisibleTasks.push(round1Des);
            if (round2Pm) allVisibleTasks.push(round2Pm);
            if (round2Des) allVisibleTasks.push(round2Des);

            for (let i = 3; i <= rounds; i++) {
                if (round1Pm) allVisibleTasks.push({ ...round1Pm, id: `t3-round-${i}-pm`, title: `Round ${i} Feedback` });
                if (round1Des) allVisibleTasks.push({ ...round1Des, id: `t3-round-${i}-des`, title: `Round ${i} Design` });
            }

            // Other tasks in Step 3
            stepTasks.forEach(t => {
                if (!t.id.startsWith('t3-round-')) allVisibleTasks.push(t);
            });
        } else {
            allVisibleTasks = [...stepTasks];
        }

        // Custom tasks
        const stepCustomTasks = project.custom_tasks?.[stepId] || [];
        allVisibleTasks = [...allVisibleTasks, ...stepCustomTasks];

        // Deleted filter
        const deletedSet = new Set(project.deleted_tasks || []);
        allVisibleTasks = allVisibleTasks.filter(t => !deletedSet.has(t.id));

        // Sorting
        const order = project.task_order?.[stepId];
        if (order && order.length > 0) {
            allVisibleTasks.sort((a, b) => {
                const idxA = order.indexOf(a.id);
                const idxB = order.indexOf(b.id);
                if (idxA === -1 && idxB === -1) return 0;
                if (idxA === -1) return 1;
                if (idxB === -1) return -1;
                return idxA - idxB;
            });
        }

        // Final Client Visibility Filter
        const clientVisibleSet = new Set(project.client_visible_tasks || []);
        // If client_visible_tasks is empty/undefined, show NOTHING? or ALL? 
        // User said "클라이언트에게 보여질 목록을 선택 후 결정". So default should be empty or user explicit selection.
        // Assuming strict filtering: only show what is in the set.
        return allVisibleTasks.filter(t => clientVisibleSet.has(t.id));
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50">Loading...</div>;
    if (errorMsg) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-red-500 font-bold">{errorMsg}</div>;
    if (!project) return null;

    return (
        <div className="min-h-screen pb-20 bg-[#e3e7ed]">
            {/* Read Only Header */}
            <div className="bg-black text-white px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-md">
                <h1 className="font-bold text-xl tracking-tight uppercase">PROJECT JOURNEY <span className="text-white/50 text-base ml-2">CLIENT VIEW</span></h1>
                <div className="text-sm font-bold opacity-70">{project.name}</div>
            </div>

            <main className="w-full px-4 md:px-6 py-10 max-w-[1800px] mx-auto">
                <div className="overflow-x-auto pb-8 no-scrollbar">
                    <div className="flex gap-8 min-w-max">
                        {STEPS_STATIC.map((step) => {
                            const tasks = getProjectTasks(step.id);
                            // Show step even if empty? Layout consistency.
                            return (
                                <StepColumn
                                    key={step.id}
                                    step={step}
                                    tasks={tasks}
                                    isLocked={false} // Always unlocked for visibility
                                    filter={Role.ALL}
                                    completedTasks={completedTasks}
                                    taskLinks={taskLinks}
                                    onToggleTask={() => { }} // No op
                                    onDeleteTask={() => { }}
                                    onContextMenu={(e) => { e.preventDefault(); }}
                                    onEditContextMenu={(e) => { e.preventDefault(); }}
                                    onToast={() => { }}
                                    isLockedProject={true}
                                    projectId={project.id}
                                />
                            );
                        })}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ClientShareView;
