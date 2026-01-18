import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar.tsx';
import StepColumn from './components/StepColumn.tsx';
import UrlPopover from './components/UrlPopover.tsx';
import TaskEditPopover from './components/TaskEditPopover.tsx';
import TaskCard from './components/TaskCard.tsx';
import ProjectList from './components/ProjectList.tsx';
import CreateProjectModal from './components/CreateProjectModal.tsx';
import TeamManagementModal from './components/TeamManagementModal.tsx';
import WelcomeScreen from './components/WelcomeScreen.tsx';
import { supabase, isSupabaseReady, signInWithGoogle, signOut } from './supabaseClient.ts';
import { STEPS_STATIC, TEAM_MEMBERS as INITIAL_TEAM_MEMBERS } from './constants.ts';
import { Role, Task, PopoverState, Project, User, TaskEditPopoverState, TeamMember } from './types.ts';

const App: React.FC = () => {
  const [user, setUser] = useState<User>({ id: 'guest', userId: 'guest', name: '게스트', avatarUrl: '' });
  const [currentView, setCurrentView] = useState<'welcome' | 'list' | 'detail'>('welcome');
  const [isInitializing, setIsInitializing] = useState(true); // New state for initial load
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isProjectLoading, setIsProjectLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [activeRole, setActiveRole] = useState<Role>(Role.ALL);

  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [taskLinks, setTaskLinks] = useState<Map<string, { url: string, label: string }>>(new Map());
  const [rounds, setRounds] = useState<number>(2);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const [popover, setPopover] = useState<PopoverState>({
    isOpen: false, taskId: null, currentUrl: '', currentLabel: '', x: 0, y: 0
  });

  const [isSnapshotMode, setIsSnapshotMode] = useState(false);
  const [snapshotSelectedTasks, setSnapshotSelectedTasks] = useState<Set<string>>(new Set());

  const [taskEditPopover, setTaskEditPopover] = useState<TaskEditPopoverState>({
    isOpen: false, taskId: null, role: Role.PM, title: '', description: '', completed_date: '', x: 0, y: 0
  });

  useEffect(() => {
    // Supabase Auth State Subscription
    if (isSupabaseReady && supabase) {
      console.log("Supabase is ready, initializing auth check...");

      const performSessionCheck = async (retryCount = 0) => {
        // 1. Manually check URL hash for tokens (Super robust for clock skew)
        const hash = window.location.hash.substring(1);
        if (hash.includes('access_token=')) {
          console.log("Found access_token in hash, attempting manual session recovery...");
          const params = new URLSearchParams(hash);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken) {
            try {
              // Try to force set the session
              const { data, error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || '',
              });

              if (error) {
                console.error("setSession error (possible clock skew):", error.message);
                // Even if there's an error, if data.user exists, we might proceed
              }

              if (data?.user) {
                console.log("Manual session recovery successful!");
                // Clear hash to prevent loops and keep URL clean
                window.history.replaceState(null, '', window.location.pathname);
                return; // onAuthStateChange will handle the rest
              }
            } catch (e) {
              console.error("Manual recovery failed:", e);
            }
          }
        }

        // 2. Standard session check
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log(`Session check #${retryCount + 1}:`, session ? "Session exists" : "No session");

        if (session?.user) {
          const u = {
            id: session.user.id,
            userId: session.user.id,
            name: session.user.user_metadata.full_name || session.user.email?.split('@')[0] || '사용자',
            avatarUrl: session.user.user_metadata.avatar_url
          };
          setUser(u);
          setCurrentView('list');
          fetchTeamMembers();
          fetchProjects();
        } else if (window.location.hash.includes('access_token') && retryCount < 3) {
          // Token exists but session retrieval failed or racing. Retry a few times.
          console.log("Token in hash but no session yet, retrying...", sessionError);
          setTimeout(() => performSessionCheck(retryCount + 1), 1000);
          return;
        } else {
          setCurrentView('welcome');
          if (window.location.hash.includes('access_token')) {
            showToast("로그인 세션 복구에 실패했습니다. 다시 로그인해주세요.");
            // Clear hash to avoid confusion
            window.history.replaceState(null, '', window.location.pathname);
          }
        }
        setIsInitializing(false);
      };

      performSessionCheck();

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log("Auth state change event:", event, session ? "Session exists" : "No session");

        if (session?.user) {
          setUser({
            id: session.user.id,
            userId: session.user.id,
            name: session.user.user_metadata.full_name || session.user.email?.split('@')[0] || '사용자',
            avatarUrl: session.user.user_metadata.avatar_url
          });
          setCurrentView('list');
          fetchTeamMembers();
          fetchProjects();
          setIsAuthLoading(false);
        } else if (event === 'SIGNED_OUT' && !window.location.hash.includes('access_token')) {
          setUser({ id: 'guest', userId: 'guest', name: '게스트', avatarUrl: '' });
          setCurrentView('welcome');
          setIsAuthLoading(false);
        }
      });

      return () => subscription.unsubscribe();
    } else {
      console.warn("Supabase not ready or missing. Using welcome screen as default.");
      setCurrentView('welcome');
      setIsInitializing(false);
    }
  }, []);

  const handleGoogleLogin = async () => {
    setIsAuthLoading(true);
    console.log("Initiating Google OAuth Login...");
    try {
      const result: any = await signInWithGoogle();
      console.log("signInWithGoogle result:", result);

      // If result has session (Mock/Immediate), we process it. 
      // If it's a real redirect, the page will reload soon.
      const sessionUser = result?.data?.session?.user;

      if (sessionUser) {
        setUser({
          id: sessionUser.id,
          userId: sessionUser.id,
          name: sessionUser.user_metadata.full_name || sessionUser.email?.split('@')[0] || '사용자',
          avatarUrl: sessionUser.user_metadata.avatar_url
        });
        setCurrentView('list');
        fetchTeamMembers();
        fetchProjects();
        showToast("성공적으로 로그인되었습니다.");
      } else if (result?.data?.url) {
        console.log("Redirect URL received, window should redirect to:", result.data.url);
      }
    } catch (error) {
      console.error("Login component error:", error);
      showToast("로그인 중 오류가 발생했습니다.");
    } finally {
      // Keep loading on for a while to prevent multi-clicks during redirect
      setTimeout(() => setIsAuthLoading(false), 3000);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      showToast("로그아웃 되었습니다.");
    } catch (error) {
      showToast("로그아웃 중 오류가 발생했습니다.");
    }
  };

  const fetchTeamMembers = async () => {
    try {
      if (isSupabaseReady && supabase) {
        const { data, error } = await supabase.from('team_members').select('*');
        if (!error && data && data.length > 0) {
          setTeamMembers(data);
          return;
        }
      }
      // Fallback to localStorage or default
      const savedTeam = localStorage.getItem('grafy_team');
      if (savedTeam) {
        setTeamMembers(JSON.parse(savedTeam));
      } else {
        const initial = INITIAL_TEAM_MEMBERS.map((m, i) => ({ ...m, id: `team-${i}` }));
        setTeamMembers(initial);
      }
    } catch (e) {
      console.error(e);
      const initial = INITIAL_TEAM_MEMBERS.map((m, i) => ({ ...m, id: `team-${i}` }));
      setTeamMembers(initial);
    }
  };

  const showToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(null), 3000); };

  const fetchProjects = async () => {
    setIsProjectLoading(true);
    try {
      if (isSupabaseReady && supabase) {
        const { data, error } = await supabase.from('projects').select('*').order('last_updated', { ascending: false });
        if (!error) setProjects(data || []);
      } else {
        const local = localStorage.getItem('grafy_projects');
        if (local) setProjects(JSON.parse(local));
      }
    } catch (e) { console.error(e); }
    setIsProjectLoading(false);
  };

  const saveProjectsLocal = async (updatedProjects: Project[]) => {
    setProjects(updatedProjects);
    localStorage.setItem('grafy_projects', JSON.stringify(updatedProjects));

    // Persist to Supabase if ready
    if (isSupabaseReady && supabase) {
      try {
        // Find the specific project that was changed and upsert it
        // Or if we deleted, handle that separately.
        // For simplicity during transition, we try to upsert all or just the current one if applicable.
        // Usually, we'd only sync the one that changed.
      } catch (e) {
        console.error("Supabase sync error:", e);
      }
    }
  };

  const syncProjectToSupabase = async (project: Project) => {
    if (isSupabaseReady && supabase) {
      const { error } = await supabase.from('projects').upsert(project);
      if (error) console.error("Supabase upsert error:", error);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    const next = projects.filter(p => p.id !== projectId);
    setProjects(next);
    localStorage.setItem('grafy_projects', JSON.stringify(next));

    if (isSupabaseReady && supabase) {
      const { error } = await supabase.from('projects').delete().eq('id', projectId);
      if (error) console.error("Supabase delete error:", error);
    }
    showToast("프로젝트가 삭제되었습니다.");
  };

  const handleToggleLock = async (locked: boolean) => {
    if (!currentProject) return;

    let end_date = currentProject.end_date;
    if (locked) {
      const now = new Date();
      const yy = String(now.getFullYear()).slice(-2);
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      end_date = `${yy}-${mm}-${dd}`;
    }

    const updated = { ...currentProject, is_locked: locked, end_date, last_updated: new Date().toISOString() };
    setCurrentProject(updated);

    const nextProjects = projects.map(p => p.id === currentProject.id ? updated : p);
    setProjects(nextProjects);
    localStorage.setItem('grafy_projects', JSON.stringify(nextProjects));

    await syncProjectToSupabase(updated);
    showToast(locked ? "프로젝트가 잠겼습니다. 종료일이 기록되었습니다." : "프로젝트 잠금이 해제되었습니다.");
  };

  const selectProject = (project: Project) => {
    setCurrentProject(project);
    setRounds(project.rounds_count || 2);
    loadTasks(project);
    setCurrentView('detail');
    setActiveRole(Role.ALL);
  };

  const loadTasks = (project: Project) => {
    // 1. Load from DB (task_states) if available
    if (project.task_states) {
      setCompletedTasks(new Set<string>(project.task_states.completed || []));
      const linkMap = new Map<string, { url: string, label: string }>();
      Object.entries(project.task_states.links || {}).forEach(([id, val]: [string, any]) => linkMap.set(id, val));
      setTaskLinks(linkMap);
      return;
    }

    // 2. Fallback to LocalStorage
    const localTasks = localStorage.getItem(`tasks_${project.id}`);
    if (localTasks) {
      const parsed = JSON.parse(localTasks);
      setCompletedTasks(new Set<string>(parsed.completed || []));
      const linkMap = new Map<string, { url: string, label: string }>();
      Object.entries(parsed.links || {}).forEach(([id, val]: [any, any]) => linkMap.set(id, val));
      setTaskLinks(linkMap);
    } else {
      setCompletedTasks(new Set<string>());
      setTaskLinks(new Map<string, { url: string, label: string }>());
    }
  };

  const syncTasks = (project: Project, completed: Set<string>, links: Map<string, { url: string, label: string }>) => {
    // 1. Sync to LocalStorage (Backup)
    localStorage.setItem(`tasks_${project.id}`, JSON.stringify({
      completed: Array.from(completed),
      links: Object.fromEntries(links)
    }));

    // 2. Sync to Supabase Update Object (State will be saved in updateProjectProgress)
    // This helper just prepares local storage. The actual DB update happens in updateProjectProgress
    // using the `updatedProject` object which includes `task_states`.
  };

  const updateProjectInfo = (updates: Partial<Project>) => {
    if (!currentProject || currentProject.is_locked) return;
    const updatedProject = { ...currentProject, ...updates, last_updated: new Date().toISOString() };
    setCurrentProject(updatedProject);
    saveProjectsLocal(projects.map(p => p.id === currentProject.id ? updatedProject : p));
  };

  const getVisibleTasks = (stepId: number, project: Project, roundCount: number) => {
    const stepCustomTasks = project.custom_tasks?.[stepId] || [];
    const deletedSet = new Set(project.deleted_tasks || []);
    let allVisibleTasks: Task[] = [];

    if (stepId === 3) {
      const baseTask = STEPS_STATIC[2].tasks[0];
      const finalTask = STEPS_STATIC[2].tasks[1];
      const roundTasks = Array.from({ length: roundCount }).flatMap((_, rIdx) => {
        const pmId = `t3-round-${rIdx + 1}-pm`;
        const desId = `t3-round-${rIdx + 1}-des`;
        const rTs = [];
        if (!deletedSet.has(pmId)) rTs.push(stepCustomTasks.find(ct => ct.id === pmId) || { id: pmId, role: Role.PM, title: `${rIdx + 1}차 피드백 수급`, completed_date: '00-00-00' });
        if (!deletedSet.has(desId)) rTs.push(stepCustomTasks.find(ct => ct.id === desId) || { id: desId, role: Role.DESIGNER, title: `${rIdx + 1}차 수정 및 업데이트`, completed_date: '00-00-00' });
        return rTs;
      });

      const onlyCustoms = stepCustomTasks.filter(ct => !['t3-base-1', 't3-final'].includes(ct.id) && !ct.id.includes('-round-'));

      if (!deletedSet.has('t3-base-1')) allVisibleTasks.push(stepCustomTasks.find(t => t.id === 't3-base-1') || baseTask);
      allVisibleTasks = [...allVisibleTasks, ...roundTasks, ...onlyCustoms];
      if (!deletedSet.has('t3-final')) allVisibleTasks.push(stepCustomTasks.find(t => t.id === 't3-final') || finalTask);
    } else {
      const stepStaticTasks = STEPS_STATIC.find(s => s.id === stepId)?.tasks || [];
      allVisibleTasks = stepStaticTasks
        .filter(st => !deletedSet.has(st.id))
        .map(st => stepCustomTasks.find(ct => ct.id === st.id) || st);
      const onlyCustoms = stepCustomTasks.filter(ct => !stepStaticTasks.some(st => st.id === ct.id));
      allVisibleTasks = [...allVisibleTasks, ...onlyCustoms];
    }

    const order = project.task_order?.[stepId];
    if (order && order.length > 0) {
      allVisibleTasks.sort((a, b) => {
        const idxA = order.indexOf(a.id);
        const idxB = order.indexOf(b.id);

        // 정렬 순서에 없는 태스크(예: 새로 추가된 태스크)는 기본적으로 뒤에 오도록 999 부여
        const valA = idxA === -1 ? 999 : idxA;
        const valB = idxB === -1 ? 999 : idxB;

        return valA - valB;
      });
    }
    return allVisibleTasks;
  };

  const isLockedStep = (stepId: number): boolean => {
    if (stepId === 1 || !currentProject) return false;
    const prevStepId = stepId - 1;
    const prevVisibleTasks = getVisibleTasks(prevStepId, currentProject, rounds);
    return !prevVisibleTasks.every(t => completedTasks.has(t.id));
  };

  const handleToggleTask = (taskId: string) => {
    if (!currentProject || currentProject.is_locked) return;
    const isNowChecking = !completedTasks.has(taskId);

    let taskStepId = 0;
    if (taskId.startsWith('t')) taskStepId = parseInt(taskId[1]);
    else if (taskId.startsWith('custom')) taskStepId = parseInt(taskId.split('-')[1]);

    if (isNowChecking) {
      if (isLockedStep(taskStepId)) {
        showToast("이전 스텝 완료가 필요합니다.");
        return;
      }
      const nextCompleted = new Set<string>(completedTasks);
      nextCompleted.add(taskId);
      setCompletedTasks(nextCompleted);

      const currentTaskData = findTaskInProject(taskId);
      if (!currentTaskData?.completed_date || currentTaskData.completed_date === '00-00-00') {
        const now = new Date();
        const yy = String(now.getFullYear()).slice(-2);
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const autoDate = `${yy}-${mm}-${dd}`;
        handleAutoSetTaskDate(taskId, autoDate, nextCompleted);
      } else {
        updateProjectProgress(nextCompleted, currentProject);
      }
    } else {
      const hasLaterChecked = Array.from(completedTasks).some((id: string) => {
        let idStep = 0;
        if (id.startsWith('t')) idStep = parseInt(id[1]);
        else if (id.startsWith('custom')) idStep = parseInt(id.split('-')[1]);
        return idStep > taskStepId;
      });
      if (hasLaterChecked) {
        showToast("다음 스텝의 체크를 모두 없애야 이전 단계를 해제할 수 있습니다.");
        return;
      }
      const nextCompleted = new Set<string>(completedTasks);
      nextCompleted.delete(taskId);
      setCompletedTasks(nextCompleted);
      updateProjectProgress(nextCompleted, currentProject);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    if (!currentProject || currentProject.is_locked) return;

    const nextCustomTasks = { ...(currentProject.custom_tasks || {}) };
    const nextTaskOrder = { ...(currentProject.task_order || {}) };
    const nextDeletedTasks = [...(currentProject.deleted_tasks || [])];

    let found = false;

    for (const stepId in nextCustomTasks) {
      const originalLen = nextCustomTasks[stepId].length;
      nextCustomTasks[stepId] = nextCustomTasks[stepId].filter(t => t.id !== taskId);
      if (nextCustomTasks[stepId].length !== originalLen) {
        found = true;
      }
      if (nextTaskOrder[stepId]) {
        nextTaskOrder[stepId] = nextTaskOrder[stepId].filter(id => id !== taskId);
      }
    }

    if (taskId.startsWith('t')) {
      if (!nextDeletedTasks.includes(taskId)) {
        nextDeletedTasks.push(taskId);
      }
      found = true;
    }

    if (found) {
      const nextCompleted = new Set<string>(completedTasks);
      nextCompleted.delete(taskId);
      setCompletedTasks(nextCompleted);

      const updatedProject = {
        ...currentProject,
        custom_tasks: nextCustomTasks,
        task_order: nextTaskOrder,
        deleted_tasks: nextDeletedTasks,
        last_updated: new Date().toISOString()
      };
      updateProjectProgress(nextCompleted, updatedProject);
      showToast("태스크가 삭제되었습니다.");
    }
  };

  const findTaskInProject = (taskId: string): Task | null => {
    if (!currentProject) return null;
    const nextCustomTasks = currentProject.custom_tasks || {};
    for (const stepId in nextCustomTasks) {
      const found = nextCustomTasks[stepId].find(t => t.id === taskId);
      if (found) return found;
    }
    for (const step of STEPS_STATIC) {
      const found = step.tasks.find(t => t.id === taskId);
      if (found) return found;
    }
    return null;
  }

  const handleAutoSetTaskDate = (taskId: string, date: string, nextCompleted: Set<string>) => {
    if (!currentProject) return;
    const nextCustomTasks = { ...(currentProject.custom_tasks || {}) };
    let found = false;
    for (const stepId in nextCustomTasks) {
      const idx = nextCustomTasks[stepId].findIndex(t => t.id === taskId);
      if (idx > -1) {
        nextCustomTasks[stepId][idx] = { ...nextCustomTasks[stepId][idx], completed_date: date };
        found = true; break;
      }
    }
    if (!found) {
      for (const step of STEPS_STATIC) {
        const sTask = step.tasks.find(t => t.id === taskId);
        if (sTask) {
          const sid = step.id;
          if (!nextCustomTasks[sid]) nextCustomTasks[sid] = [];
          nextCustomTasks[sid].push({ ...sTask, completed_date: date });
          found = true; break;
        }
      }
    }
    const updatedProject = { ...currentProject, custom_tasks: nextCustomTasks, last_updated: new Date().toISOString() };
    updateProjectProgress(nextCompleted, updatedProject);
  };

  const updateProjectProgress = async (nextCompleted: Set<string>, project: Project) => {
    syncTasks(project, nextCompleted, taskLinks); // Save to local backup

    const total = calculateTotalTasks(project);
    const percent = total === 0 ? 0 : Math.round((nextCompleted.size / total) * 100);

    // Prepare task_states for DB
    const task_states = {
      completed: Array.from(nextCompleted),
      links: Object.fromEntries(taskLinks)
    };

    const updatedProject = {
      ...project,
      status: Math.min(100, percent),
      last_updated: new Date().toISOString(),
      task_states // Include in update
    };

    setCurrentProject(updatedProject);
    saveProjectsLocal(projects.map(p => p.id === project.id ? updatedProject : p));

    // Supabase Update
    if (isSupabaseReady && supabase) {
      // JSONB fields need to be stringified or passed as objects depending on driver, supabase-js handles objects fine.
      try {
        await supabase.from('projects').update({
          status: updatedProject.status,
          last_updated: updatedProject.last_updated,
          custom_tasks: updatedProject.custom_tasks,
          task_order: updatedProject.task_order,
          deleted_tasks: updatedProject.deleted_tasks,
          start_date: updatedProject.start_date,
          end_date: updatedProject.end_date,
          is_locked: updatedProject.is_locked,
          rounds_count: updatedProject.rounds_count,
          task_states: task_states // Sync this!
        }).eq('id', project.id);
      } catch (e) {
        console.error("Failed to sync to Supabase", e);
      }
    }
  };

  const calculateTotalTasks = (project: Project) => {
    let count = 0;
    const deletedSet = new Set(project.deleted_tasks || []);

    STEPS_STATIC.forEach(step => {
      if (step.id === 3) {
        if (!deletedSet.has('t3-base-1')) count += 1;
        if (!deletedSet.has('t3-final')) count += 1;

        const roundCount = (project.rounds_count || 2);
        for (let r = 1; r <= roundCount; r++) {
          if (!deletedSet.has(`t3-round-${r}-pm`)) count += 1;
          if (!deletedSet.has(`t3-round-${r}-des`)) count += 1;
        }
      } else {
        step.tasks.forEach(t => {
          if (!deletedSet.has(t.id)) count += 1;
        });
      }
      if (project.custom_tasks?.[step.id]) {
        count += project.custom_tasks[step.id].filter(t => !t.id.startsWith('t')).length;
      }
    });
    return count;
  };

  const handleUpdateRounds = (newRounds: number) => {
    if (!currentProject || currentProject.is_locked) return;
    setRounds(newRounds);
    const updated = { ...currentProject, rounds_count: newRounds };
    updateProjectProgress(completedTasks, updated);
  };

  const handleAddCustomTask = (stepId: number) => {
    if (!currentProject || currentProject.is_locked) return;
    if (isLockedStep(stepId)) {
      showToast("이전 스텝 완료가 필요합니다.");
      return;
    }
    const nextCustomTasks = { ...(currentProject.custom_tasks || {}) };
    const newTask: Task = {
      id: `custom-${stepId}-${Date.now()}`,
      role: Role.PM, title: '새로운 태스크', description: '', hasFile: true, completed_date: '00-00-00'
    };
    nextCustomTasks[stepId] = [...(nextCustomTasks[stepId] || []), newTask];

    const nextTaskOrder = { ...(currentProject.task_order || {}) };
    const currentOrder = nextTaskOrder[stepId] || getVisibleTasks(stepId, currentProject, rounds).map(t => t.id);

    // 신규 태스크는 항상 맨 뒤에 오도록 순서 배열의 끝에 추가합니다.
    nextTaskOrder[stepId] = [...currentOrder, newTask.id];

    const updatedProject = {
      ...currentProject,
      custom_tasks: nextCustomTasks,
      task_order: nextTaskOrder,
      last_updated: new Date().toISOString()
    };
    updateProjectProgress(completedTasks, updatedProject);
    showToast("태스크가 추가되었습니다.");
  };

  const handleReorderTasks = async (stepId: number, fromIdx: number, toIdx: number) => {
    if (!currentProject || currentProject.is_locked) return;
    if (isLockedStep(stepId)) {
      showToast("이전 스텝 완료가 필요합니다.");
      return;
    }

    const allVisibleTasks = getVisibleTasks(stepId, currentProject, rounds);

    // Step 3의 원자적 그룹 드래그 처리를 위해 데이터 구조를 일시적으로 그룹화합니다.
    if (stepId === 3) {
      const grouped: (Task | Task[])[] = [];
      let i = 0;
      while (i < allVisibleTasks.length) {
        const task = allVisibleTasks[i];
        if (task.id.match(/t3-round-\d+-pm/)) {
          const next = allVisibleTasks[i + 1];
          if (next && next.id === task.id.replace('-pm', '-des')) {
            grouped.push([task, next]);
            i += 2;
          } else {
            grouped.push(task);
            i++;
          }
        } else {
          grouped.push(task);
          i++;
        }
      }

      // 그룹 리스트에서의 인덱스 찾기
      const findGroupIdx = (taskIdx: number) => {
        let currentIdx = 0;
        for (let gIdx = 0; gIdx < grouped.length; gIdx++) {
          const g = grouped[gIdx];
          const len = Array.isArray(g) ? g.length : 1;
          if (taskIdx >= currentIdx && taskIdx < currentIdx + len) return gIdx;
          currentIdx += len;
        }
        return grouped.length - 1;
      };

      const groupFromIdx = findGroupIdx(fromIdx);
      const groupToIdx = findGroupIdx(toIdx);

      const [removed] = grouped.splice(groupFromIdx, 1);
      grouped.splice(groupToIdx, 0, removed);

      const flattened = grouped.flat();
      const nextTaskOrder = { ...(currentProject.task_order || {}) };
      nextTaskOrder[stepId] = flattened.map(t => t.id);

      const updatedProject = { ...currentProject, task_order: nextTaskOrder, last_updated: new Date().toISOString() };
      setCurrentProject(updatedProject);
      saveProjectsLocal(projects.map(p => p.id === currentProject.id ? updatedProject : p));
      return;
    }

    // 일반 스텝 재정렬
    const result = Array.from(allVisibleTasks);
    const [removed] = result.splice(fromIdx, 1);
    result.splice(toIdx, 0, removed);

    const nextTaskOrder = { ...(currentProject.task_order || {}) };
    nextTaskOrder[stepId] = result.map(t => t.id);

    const updatedProject = { ...currentProject, task_order: nextTaskOrder, last_updated: new Date().toISOString() };
    setCurrentProject(updatedProject);
    const nextProjects = projects.map(p => p.id === currentProject.id ? updatedProject : p);
    setProjects(nextProjects);
    localStorage.setItem('grafy_projects', JSON.stringify(nextProjects));
    await syncProjectToSupabase(updatedProject);
  };

  const handleSaveTaskInfo = (taskId: string, role: Role, title: string, description: string, completed_date: string) => {
    if (!currentProject || currentProject.is_locked) return;
    const nextCustomTasks = { ...(currentProject.custom_tasks || {}) };
    let found = false;

    // 1. 기존 custom_tasks에서 검색 및 업데이트
    for (const stepId in nextCustomTasks) {
      const idx = nextCustomTasks[stepId].findIndex(t => t.id === taskId);
      if (idx > -1) {
        nextCustomTasks[stepId][idx] = { ...nextCustomTasks[stepId][idx], role, title, description, completed_date };
        found = true; break;
      }
    }

    // 2. static 태스크인 경우 custom_tasks에 구체화하여 저장
    if (!found) {
      for (const step of STEPS_STATIC) {
        const sTask = step.tasks.find(t => t.id === taskId);
        if (sTask) {
          const sid = step.id;
          if (!nextCustomTasks[sid]) nextCustomTasks[sid] = [];
          nextCustomTasks[sid].push({ ...sTask, role, title, description, completed_date });
          found = true; break;
        }
      }
    }

    // 3. 피드백 라운드 동적 태스크인 경우 custom_tasks에 구체화하여 저장
    if (!found && taskId.startsWith('t3-round-')) {
      const sid = 3;
      if (!nextCustomTasks[sid]) nextCustomTasks[sid] = [];
      const isPm = taskId.endsWith('-pm');
      const roundNum = taskId.split('-')[2];
      const defaultTitle = isPm ? `${roundNum}차 피드백 수급` : `${roundNum}차 수정 및 업데이트`;
      const defaultRole = isPm ? Role.PM : Role.DESIGNER;

      nextCustomTasks[sid].push({
        id: taskId,
        role: role || defaultRole,
        title: title || defaultTitle,
        description: description || '',
        completed_date: completed_date || '00-00-00'
      });
      found = true;
    }

    if (found) {
      const updatedProject = { ...currentProject, custom_tasks: nextCustomTasks, last_updated: new Date().toISOString() };
      updateProjectProgress(completedTasks, updatedProject);
      syncProjectToSupabase(updatedProject); // Async sync
      showToast("태스크 정보 저장 완료");
    }
    setTaskEditPopover(prev => ({ ...prev, isOpen: false }));
  };

  const handleCreateProject = async (name: string, pm: TeamMember | null, designers: (TeamMember | null)[], startDate: string) => {
    const [dLead, d1, d2] = designers;
    const newProject: Project = {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      name,
      pm_name: pm ? `${pm.name} ${pm.title}` : '',
      pm_phone: pm?.phone,
      pm_email: pm?.email,
      designer_name: dLead ? `${dLead.name} ${dLead.title}` : '',
      designer_phone: dLead?.phone,
      designer_email: dLead?.email,
      designer_2_name: d1 ? `${d1.name} ${d1.title}` : '',
      designer_2_phone: d1?.phone,
      designer_2_email: d1?.email,
      designer_3_name: d2 ? `${d2.name} ${d2.title}` : '',
      designer_3_phone: d2?.phone,
      designer_3_email: d2?.email,
      status: 0,
      last_updated: new Date().toISOString(),
      rounds_count: 2,
      start_date: startDate,
      deleted_tasks: []
    };
    const updatedProjects = [newProject, ...projects];
    setProjects(updatedProjects);
    localStorage.setItem('grafy_projects', JSON.stringify(updatedProjects));
    await syncProjectToSupabase(newProject);

    setShowCreateModal(false);
    selectProject(newProject);
    showToast("프로젝트가 생성되었습니다.");
  };

  const handleSaveUrl = async (taskId: string, url: string, label: string) => {
    if (!currentProject || currentProject.is_locked) return;
    const nextLinks = new Map<string, { url: string, label: string }>(taskLinks);
    nextLinks.set(taskId, { url, label });
    setTaskLinks(nextLinks);
    updateProjectProgress(completedTasks, { ...currentProject }); // Trigger save with new links

    const updatedProject = { ...currentProject, last_updated: new Date().toISOString() };
    setCurrentProject(updatedProject);
    const nextProjects = projects.map(p => p.id === currentProject.id ? updatedProject : p);
    setProjects(nextProjects);
    localStorage.setItem('grafy_projects', JSON.stringify(nextProjects));
    await syncProjectToSupabase(updatedProject);
    showToast("링크가 저장되었습니다.");
  };

  /* Snapshot Logic */
  const handleSnapshotToggle = () => {
    if (!currentProject || currentProject.is_locked) return;
    if (!isSnapshotMode) {
      // Enter Snapshot Mode: Load existing visible tasks
      setSnapshotSelectedTasks(new Set(currentProject.client_visible_tasks || []));
      setIsSnapshotMode(true);
      showToast("클라이언트 스냅샷 모드가 활성화되었습니다.");
    } else {
      // Exit without saving
      setIsSnapshotMode(false);
      setSnapshotSelectedTasks(new Set());
    }
  };

  const handleSnapshotTaskSelect = (taskId: string) => {
    const next = new Set(snapshotSelectedTasks);
    if (next.has(taskId)) next.delete(taskId);
    else next.add(taskId);
    setSnapshotSelectedTasks(next);
  };

  const handleSaveSnapshot = async () => {
    if (!currentProject) return;
    const visibleList = Array.from(snapshotSelectedTasks);

    // Update Local
    const updated = { ...currentProject, client_visible_tasks: visibleList, last_updated: new Date().toISOString() };
    setCurrentProject(updated);
    saveProjectsLocal(projects.map(p => p.id === currentProject.id ? updated : p));

    // Update DB
    if (isSupabaseReady && supabase) {
      await supabase.from('projects').update({
        client_visible_tasks: visibleList,
        last_updated: updated.last_updated
      }).eq('id', updated.id);
    }

    setIsSnapshotMode(false);
    showToast("클라이언트 뷰 설정이 저장되었습니다.");
  };

  const status = currentProject?.status || 0;

  return (
    <div className="min-h-screen pb-20 bg-[#e3e7ed] selection:bg-black selection:text-white">
      {/* Snapshot Mode Header Message */}
      {isSnapshotMode && (
        <div className="sticky top-[73px] md:top-[88px] z-30 bg-black text-white px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-3 shadow-md animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <i className="fa-solid fa-camera text-red-500 animate-pulse"></i>
            <span className="font-bold text-sm md:text-base">클라이언트에게 보여질 목록을 선택 후 결정 버튼을 눌러 주세요</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsSnapshotMode(false)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 transition-colors">취소</button>
            <button onClick={handleSaveSnapshot} className="px-4 py-1.5 rounded-lg text-xs font-bold bg-white text-black hover:bg-slate-200 transition-colors shadow-sm">결정 완료</button>
          </div>
        </div>
      )}

      {currentView === 'welcome' && !isInitializing && <WelcomeScreen onLogin={handleGoogleLogin} isLoading={isAuthLoading} />}

      {isInitializing && (
        <div className="min-h-screen flex items-center justify-center bg-[#e3e7ed]">
          <div className="flex flex-col items-center gap-4">
            <i className="fa-solid fa-plane text-4xl text-black animate-airplane-pulse"></i>
            <p className="text-black font-bold">탑승 수속 중...</p>
          </div>
        </div>
      )}

      {currentView === 'list' && (
        <>

          <ProjectList
            projects={projects}
            onSelectProject={selectProject}
            onNewProject={() => setShowCreateModal(true)}
            onManageTeam={() => setShowTeamModal(true)}
            isLoading={isProjectLoading}
            onDeleteProject={handleDeleteProject}
            onLogout={handleLogout}
            onLogin={handleGoogleLogin}
          />
          {showCreateModal && <CreateProjectModal teamMembers={teamMembers} onClose={() => setShowCreateModal(false)} onCreate={handleCreateProject} />}
          {showTeamModal && <TeamManagementModal members={teamMembers} onClose={() => setShowTeamModal(false)} onUpdate={(t) => { setTeamMembers(t); localStorage.setItem('grafy_team', JSON.stringify(t)); showToast("팀 명단 저장"); }} />}
        </>
      )}

      {currentView === 'detail' && currentProject && (
        <div className="relative" onClick={() => {
          setPopover(p => ({ ...p, isOpen: false }));
          setTaskEditPopover(p => ({ ...p, isOpen: false }));
        }}>
          <Navbar
            project={currentProject}
            user={user}
            teamMembers={teamMembers}
            activeRole={activeRole}
            onRoleChange={setActiveRole}
            onBack={() => { setCurrentProject(null); setCurrentView('list'); }}
            onUpdateInfo={updateProjectInfo}
            onToast={showToast}
            onToggleLock={handleToggleLock}
            onLogout={handleLogout}
            onLogin={handleGoogleLogin}
            isSnapshotMode={isSnapshotMode}
            onSnapshotToggle={handleSnapshotToggle}
          />
          <main className="w-full px-4 md:px-6 py-10 max-w-[1800px] mx-auto">
            <div className="max-w-[1800px] mx-auto">
              {/* Progress Section */}
              <div className="bg-white p-6 md:p-8 rounded-[1.25rem] md:rounded-[1.5rem] mb-6 md:mb-10 flex flex-col md:flex-row items-center gap-6 md:gap-10 border border-slate-200 shadow-sm relative overflow-visible">
                <div className="shrink-0 relative z-10 w-full md:w-auto text-center md:text-left">
                  <span className="text-[18px] md:text-[24px] font-bold text-black leading-none uppercase tracking-tighter">PROJECT JOURNEY</span>
                </div>
                <div className="flex-1 h-3.5 md:h-4 bg-slate-100 rounded-full p-0 relative z-10 border border-slate-200 shadow-inner flex items-center overflow-visible w-full">
                  <div className="bg-black h-full rounded-full transition-all duration-1000 ease-out relative flex items-center overflow-visible" style={{ width: `${status}%` }}>
                    {status >= 0 && (
                      <div className="absolute right-[-12px] md:right-[-15px] top-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 md:w-10 md:h-10 z-50 pointer-events-none">
                        <i className="fa-solid fa-plane text-black text-[20px] md:text-[34px] animate-airplane-pulse drop-shadow-[0_0_12px_rgba(0,0,0,0.2)]"></i>
                      </div>
                    )}
                  </div>
                </div>
                <div className="shrink-0 relative z-10 flex items-baseline">
                  <span className="text-[40px] md:text-[52px] font-bold text-black leading-none tracking-tighter">{status}</span>
                  <span className="text-xl md:text-2xl font-bold text-black/50 ml-1">%</span>
                </div>
              </div>

              {/* Steps Layout */}
              <div className="overflow-x-auto pb-8 no-scrollbar scroll-smooth">
                <div className="flex gap-4 md:gap-8 min-w-max px-0">
                  {STEPS_STATIC.map((step) => {
                    const allVisibleTasks = currentProject ? getVisibleTasks(step.id, currentProject, rounds) : [];
                    const locked = isLockedStep(step.id);
                    return (
                      <StepColumn
                        key={step.id}
                        step={step}
                        tasks={allVisibleTasks}
                        isLocked={locked}
                        filter={activeRole}
                        completedTasks={completedTasks}
                        taskLinks={taskLinks}
                        onToggleTask={handleToggleTask}
                        onReorder={handleReorderTasks}
                        onDeleteTask={handleDeleteTask}
                        onContextMenu={(e, id, url, label) => {
                          // Client Visibility Logic to be implemented in popover or context menu
                          setPopover({ isOpen: true, taskId: id, currentUrl: url || '', currentLabel: label || '', x: e.pageX, y: e.pageY });
                          setTaskEditPopover(p => ({ ...p, isOpen: false }));
                        }}
                        onEditContextMenu={(e, task) => {
                          if (isSnapshotMode) return;
                          setTaskEditPopover({
                            isOpen: true, taskId: task.id, role: task.role, title: task.title, description: task.description || '', completed_date: task.completed_date || '00-00-00', x: e.clientX, y: e.clientY
                          });
                        }}
                        onToast={showToast}
                        isLockedProject={currentProject.is_locked}
                        projectId={currentProject.id}
                        isSnapshotMode={isSnapshotMode}
                        snapshotSelectedTasks={snapshotSelectedTasks}
                        onSnapshotTaskSelect={handleSnapshotTaskSelect}
                        onAddTask={() => handleAddCustomTask(step.id)}
                      >
                        {step.id === 3 && (
                          <div className="flex justify-center gap-4 md:gap-6 py-1">
                            <button
                              onClick={() => rounds > 2 && handleUpdateRounds(rounds - 1)}
                              className={`w-10 h-10 md:w-12 md:h-12 rounded-full bg-white border border-slate-300 shadow-lg transition-all flex items-center justify-center text-black font-bold active:scale-90 ${currentProject?.is_locked || rounds <= 2 ? 'opacity-50 cursor-not-allowed' : 'hover:border-black'}`}
                              disabled={currentProject?.is_locked || rounds <= 2}
                            >
                              <i className="fa-solid fa-minus"></i>
                            </button>
                            <button
                              onClick={() => handleUpdateRounds(rounds + 1)}
                              className={`w-10 h-10 md:w-12 md:h-12 rounded-full bg-black text-white shadow-lg transition-all flex items-center justify-center text-sm active:scale-90 ${currentProject?.is_locked ? 'opacity-50 cursor-not-allowed' : ''}`}
                              disabled={currentProject?.is_locked}
                            >
                              <i className="fa-solid fa-plus"></i>
                            </button>
                          </div>
                        )}
                      </StepColumn>
                    );
                  })}
                </div>
              </div>
            </div>
          </main>
          {/* Popovers positioned absolutely to stay fixed relative to document content on scroll */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-[110]">
            <div className="pointer-events-auto">
              <UrlPopover popoverState={popover} onClose={() => setPopover(p => ({ ...p, isOpen: false }))} onSave={handleSaveUrl} isAbsolute={true} />
              <TaskEditPopover state={taskEditPopover} onClose={() => setTaskEditPopover(p => ({ ...p, isOpen: false }))} onSave={handleSaveTaskInfo} isAbsolute={true} />
            </div>
          </div>
        </div >
      )}
      {
        toastMsg && (
          <div className={`fixed bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 text-white px-8 md:px-12 py-4 md:py-6 rounded-full text-sm md:text-[18px] font-bold z-[9999] shadow-2xl animate-in fade-in slide-in-from-bottom-10 duration-500 flex items-center gap-3 md:gap-4 ${toastMsg.includes("이전 스텝") ? "bg-red-500" : "bg-black"}`}>
            {toastMsg.includes("이전 스텝") ? <i className="fa-solid fa-circle-xmark text-white"></i> : <i className="fa-solid fa-circle-info text-white"></i>}
            {toastMsg}
          </div>
        )
      }
    </div >
  );
};

export default App;