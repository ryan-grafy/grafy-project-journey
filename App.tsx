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
import SharedProjectView from './components/SharedProjectView.tsx';
import { STEPS_STATIC, TEAM_MEMBERS as INITIAL_TEAM_MEMBERS } from './constants.ts';
import { Role, Task, PopoverState, Project, User, TaskEditPopoverState, TeamMember } from './types.ts';

const App: React.FC = () => {
  const [user, setUser] = useState<User>({ id: 'guest', userId: 'guest', name: '게스트', avatarUrl: '' });
  const [currentView, setCurrentView] = useState<'welcome' | 'list' | 'detail' | 'share'>('welcome');
  const [isInitializing, setIsInitializing] = useState(true);
  const [sharedProjectId, setSharedProjectId] = useState<string | null>(null);
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
  const [rounds2, setRounds2] = useState<number>(2); // Expedition 2 rounds
  const [roundsNavigation, setRoundsNavigation] = useState<number>(1); // Navigation rounds (Step 2)
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const [popover, setPopover] = useState<PopoverState>({
    isOpen: false, taskId: null, currentUrl: '', currentLabel: '', x: 0, y: 0
  });

  const [isSnapshotMode, setIsSnapshotMode] = useState(false);
  const [snapshotSelectedTasks, setSnapshotSelectedTasks] = useState<Set<string>>(new Set());

  const [taskEditPopover, setTaskEditPopover] = useState<TaskEditPopoverState>({
    isOpen: false, taskId: null, roles: [Role.PM], title: '', description: '', completed_date: '', x: 0, y: 0
  });

  // --- SAFEGUARDS ---
  // Force Welcome if Guest is on List
  useEffect(() => {
    if (currentView === 'list' && user.userId === 'guest') {
      console.warn("Detected Guest state on List view. Forcing Welcome screen.");
      setCurrentView('welcome');
    }
  }, [currentView, user.userId]);

  // Global Safety Timeout for Initialization
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isInitializing) {
        console.warn("Initialization timed out (5s). Forcing completion.");
        setIsInitializing(false);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [isInitializing]);
  // ------------------

  useEffect(() => {
    let active = true; // cleanup guard

    // 0. Check for Shared Link first - PRIORITY 1
    const path = window.location.pathname;
    if (path.startsWith('/share/')) {
      console.log("Shared link detecting:", path);
      const pid = path.split('/share/')[1];
      if (pid) {
        setSharedProjectId(pid);
        setCurrentView('share');
        setIsInitializing(false);
        // DO NOT run auth checks if we are in shared view mode.
        return;
      }
    }

    // Supabase Auth State Subscription - PRIORITY 2
    if (isSupabaseReady && supabase) {
      console.log("Supabase is ready, initializing auth check...");

      const performSessionCheck = async (retryCount = 0) => {
        try {
          // 1. Manually check URL hash for tokens (Super robust for clock skew)
          const hash = window.location.hash.substring(1);
          if (hash.includes('access_token=')) {
            console.log("Found access_token in hash, attempting manual session recovery...");
            const params = new URLSearchParams(hash);
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');

            if (accessToken) {
              const { data, error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || '',
              });

              if (error) console.error("setSession error:", error.message);
              // If successful, the onAuthStateChange will fire 'SIGNED_IN'
              if (data?.user) {
                console.log("Manual setSession successful -> waiting for onAuthStateChange");
                window.history.replaceState(null, '', window.location.pathname);
                // We don't need to do anything else, the listener will handle it.
                return;
              }
            }
          }

          // 2. Standard session check
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          console.log(`Session check #${retryCount + 1}:`, session ? "Session exists" : "No session");

          if (!active) return; // Unmounted

          if (session?.user) {
            // AUTHORIZATION CHECK
            const isAuthorized = await checkEmailAuthorization(session.user.email);
            if (!isAuthorized) {
              console.warn("Unauthorized user found during session check:", session.user.email);
              await handleLogout();
              showToast("허가되지 않은 계정입니다. 접근이 거부되었습니다.");
              return;
            }

            const u = {
              id: session.user.id,
              userId: session.user.id,
              name: session.user.user_metadata.full_name || session.user.email?.split('@')[0] || '사용자',
              avatarUrl: session.user.user_metadata.avatar_url,
              email: session.user.email
            };
            setUser(u);
            setCurrentView('list');
            fetchTeamMembers();
            fetchProjects();
          } else if (window.location.hash.includes('access_token') && retryCount < 3) {
            console.log("Token in hash but no session yet, retrying...", sessionError);
            setTimeout(() => performSessionCheck(retryCount + 1), 1000);
            return; // Don't turn off init yet
          } else {
            console.log("No session found, modifying view to Welcome.");
            setCurrentView('welcome');
          }
        } catch (e) {
          console.error("Session check failed:", e);
          if (active) setCurrentView('welcome');
        } finally {
          if (active) setIsInitializing(false);
        }
      };

      performSessionCheck();

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log("Auth state change event:", event);
        if (!active) return;

        // Critical: Do NOT change view if we are already in SHARE mode
        if (window.location.pathname.startsWith('/share/')) return;

        // BUG FIX: Do not reset view on token refresh (happens on tab switch)
        if (event === 'TOKEN_REFRESHED') {
          console.log("Token refreshed, preserving current view.");
          return;
        }

        if (session?.user) {
          // AUTHORIZATION CHECK
          const isAuthorized = await checkEmailAuthorization(session.user.email);
          if (!isAuthorized) {
            console.warn("Unauthorized user login attempt:", session.user.email);
            await handleLogout();
            showToast("허가되지 않은 계정입니다. 접근이 거부되었습니다.");
            return;
          }

          setUser({
            id: session.user.id,
            userId: session.user.id,
            name: session.user.user_metadata.full_name || session.user.email?.split('@')[0] || '사용자',
            avatarUrl: session.user.user_metadata.avatar_url,
            email: session.user.email
          });
          setCurrentView(prev => prev === 'welcome' ? 'list' : prev);
          // Only fetch if we are not already loaded? Or always fetch to sync? Keeping fetch is safer for data, but view must be preserved.
          fetchTeamMembers();
          fetchProjects();
          setIsAuthLoading(false);
        } else if (event === 'SIGNED_OUT') {
          console.log("User Signed Out -> Switch to Welcome");
          setUser({ id: 'guest', userId: 'guest', name: '게스트', avatarUrl: '' });
          setCurrentView('welcome');
          window.history.pushState(null, '', '/'); // Ensure URL is clean
          setIsAuthLoading(false);
          setIsInitializing(false);
        } else if (event === 'INITIAL_SESSION') {
          // Just handled by performSessionCheck usually, but safe to ignore or set loading false
          setIsInitializing(false);
        }
      });

      return () => {
        active = false;
        subscription.unsubscribe();
      };
    } else {
      console.warn("Supabase not ready. Using welcome screen.");
      setCurrentView('welcome');
      setIsInitializing(false);
    }
  }, []);

  // URL Search Params for Direct Project Navigation
  useEffect(() => {
    if (!projects || projects.length === 0) return;

    // Check for "project" query param
    const params = new URLSearchParams(window.location.search);
    const projectIdParam = params.get('project');

    if (projectIdParam) {
      const targetProject = projects.find(p => p.id === projectIdParam);
      if (targetProject) {
        if (currentProject?.id !== targetProject.id) {
           selectProject(targetProject);
           // Optional: clear param to avoid re-triggering? 
           // Better to keep it so "Back" button works or refresh works.
           // But if user goes back to list, we should probably clear it?
           // For now, let's just leave it, or handle "Back to List" button to clear it.
        }
      }
    }
  }, [projects]);

  // Helper to check if email is allowed
  const checkEmailAuthorization = async (email: string | undefined): Promise<boolean> => {
    if (!email) return false;

    // 1. Check Constants (Fastest)
    const constantEmails = INITIAL_TEAM_MEMBERS.map(m => m.email);
    if (constantEmails.includes(email)) return true;

    // 2. Check LocalStorage (Sync Fallback)
    const local = localStorage.getItem('grafy_team');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.some((m: TeamMember) => m.email === email)) return true;
      } catch (e) { console.error("Error parsing local team data", e); }
    }

    // 3. Check Supabase (Most Accurate)
    if (isSupabaseReady && supabase) {
      try {
        const { data, error } = await supabase.from('team_members').select('email').eq('email', email).limit(1);
        if (data && data.length > 0) return true;
      } catch (e) { console.error("Error checking supabase authorization", e); }
    }

    return false;
  };

  const handleGoogleLogin = async () => {
    setIsAuthLoading(true);
    console.log("Initiating Google OAuth Login...");
    try {
      const result: any = await signInWithGoogle();
      console.log("signInWithGoogle result:", result);

      const sessionUser = result?.data?.session?.user;

      if (sessionUser) {
        // AUTHORIZATION CHECK
        const isAuthorized = await checkEmailAuthorization(sessionUser.email);
        if (!isAuthorized) {
          console.warn("Unauthorized user login:", sessionUser.email);
          await handleLogout();
          showToast("허가되지 않은 계정입니다. 접근이 거부되었습니다.");
          return;
        }

        setUser({
          id: sessionUser.id,
          userId: sessionUser.id,
          name: sessionUser.user_metadata.full_name || sessionUser.email?.split('@')[0] || '사용자',
          avatarUrl: sessionUser.user_metadata.avatar_url,
          email: sessionUser.email
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
      // If we didn't return early due to auth check, stop loading
      setTimeout(() => setIsAuthLoading(false), 3000);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      showToast("로그아웃 되었습니다.");
      // Force a hard reload to root to ensure clean state and show login screen
      window.location.href = '/';
    } catch (error) {
      showToast("로그아웃 중 오류가 발생했습니다.");
      // Even if error, try to redirect
      window.location.href = '/';
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
    if (isSupabaseReady && supabase) {
      try {
        // Sync logic could go here
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
    setRounds2(project.rounds2_count || 2);
    setRoundsNavigation(project.rounds_navigation_count || 1);
    loadTasks(project);
    setCurrentView('detail');
    setActiveRole(Role.ALL);
  };

  const loadTasks = (project: Project) => {
    if (project.task_states) {
      setCompletedTasks(new Set<string>(project.task_states.completed || []));
      const linkMap = new Map<string, { url: string, label: string }>();
      Object.entries(project.task_states.links || {}).forEach(([id, val]: [string, any]) => linkMap.set(id, val));
      setTaskLinks(linkMap);
      return;
    }

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
    localStorage.setItem(`tasks_${project.id}`, JSON.stringify({
      completed: Array.from(completed),
      links: Object.fromEntries(links)
    }));
  };

  const updateProjectInfo = (updates: Partial<Project>) => {
    if (!currentProject || currentProject.is_locked) return;
    const updatedProject = { ...currentProject, ...updates, last_updated: new Date().toISOString() };
    setCurrentProject(updatedProject);
    saveProjectsLocal(projects.map(p => p.id === currentProject.id ? updatedProject : p));
    showToast("프로젝트 정보 저장 완료");
  };

  const getVisibleTasks = (stepId: number, project: Project, roundCount: number) => {
    const stepCustomTasks = project.custom_tasks?.[stepId] || [];
    const deletedSet = new Set(project.deleted_tasks || []);
    let allVisibleTasks: Task[] = [];

    if (stepId === 2) {
      const roundCount = project.rounds_navigation_count || 1;
      const roundTasks = Array.from({ length: roundCount }).flatMap((_, rIdx) => {
        const propId = `t2-round-${rIdx + 1}-prop`;
        const feedId = `t2-round-${rIdx + 1}-feed`;
        const rTs = [];
        if (!deletedSet.has(propId)) {
          rTs.push(stepCustomTasks.find(ct => ct.id === propId) || 
            { id: propId, roles: [Role.PM, Role.DESIGNER], title: `${rIdx + 1}차 제안_버벌 아이덴티티 / 브랜드네임, 슬로건 등 도출_Ver${rIdx + 1}.0`, description: '시장 조사, 기획, 디자인 원칙, 전체적인 비주얼아이덴티티 도출을 위한 맥락 등의 디자인 소스를 제작', completed_date: '00-00-00' }
          );
        }
        if (!deletedSet.has(feedId)) {
          rTs.push(stepCustomTasks.find(ct => ct.id === feedId) || 
            { id: feedId, roles: [Role.CLIENT, Role.PM], title: `${rIdx + 1}차 제안에 대한 피드백`, description: '( 초기 스냅샷 금지 ) 1차 피드백을 확인할 수 있습니다', completed_date: '00-00-00' }
          );
        }
        return rTs;
      });
      const onlyCustoms = stepCustomTasks.filter(ct => !ct.id.includes('-round-'));
      allVisibleTasks = [...roundTasks, ...onlyCustoms];

    } else if (stepId === 3) {
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
    } else if (stepId === 4) {
      const roundCount2 = project.rounds2_count || 2;
      const roundTasks = Array.from({ length: roundCount2 }).flatMap((_, rIdx) => {
        const pmId = `t4-round-${rIdx + 1}-pm`;
        const desId = `t4-round-${rIdx + 1}-des`;
        const rTs = [];
        if (!deletedSet.has(pmId)) rTs.push(stepCustomTasks.find(ct => ct.id === pmId) || { id: pmId, roles: [Role.PM], title: `${rIdx + 1}차 피드백 수급`, completed_date: '00-00-00' });
        if (!deletedSet.has(desId)) rTs.push(stepCustomTasks.find(ct => ct.id === desId) || { id: desId, roles: [Role.DESIGNER], title: `${rIdx + 1}차 수정 및 업데이트`, completed_date: '00-00-00' });
        return rTs;
      });
      const onlyCustoms = stepCustomTasks.filter(ct => !ct.id.includes('-round-'));
      allVisibleTasks = [...roundTasks, ...onlyCustoms];
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
      if (nextCustomTasks[stepId].length !== originalLen) found = true;
      if (nextTaskOrder[stepId]) nextTaskOrder[stepId] = nextTaskOrder[stepId].filter(id => id !== taskId);
    }
    if (taskId.startsWith('t')) {
      if (!nextDeletedTasks.includes(taskId)) nextDeletedTasks.push(taskId);
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
    const task_states = {
      completed: Array.from(nextCompleted),
      links: Object.fromEntries(taskLinks)
    };
    const updatedProject = {
      ...project,
      status: Math.min(100, percent),
      last_updated: new Date().toISOString(),
      task_states
    };
    setCurrentProject(updatedProject);
    saveProjectsLocal(projects.map(p => p.id === project.id ? updatedProject : p));
    if (isSupabaseReady && supabase) {
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
          task_states: task_states
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
      if (step.id === 2) {
        const roundCount = (project.rounds_navigation_count || 1);
        for (let r = 1; r <= roundCount; r++) {
          if (!deletedSet.has(`t2-round-${r}-prop`)) count += 1;
          if (!deletedSet.has(`t2-round-${r}-feed`)) count += 1;
        }
      } else if (step.id === 3) {
        if (!deletedSet.has('t3-base-1')) count += 1;
        if (!deletedSet.has('t3-final')) count += 1;
        const roundCount = (project.rounds_count || 2);
        for (let r = 1; r <= roundCount; r++) {
          if (!deletedSet.has(`t3-round-${r}-pm`)) count += 1;
          if (!deletedSet.has(`t3-round-${r}-des`)) count += 1;
        }
      } else if (step.id === 4) {
        const roundCount2 = (project.rounds2_count || 2);
        for (let r = 1; r <= roundCount2; r++) {
          if (!deletedSet.has(`t4-round-${r}-pm`)) count += 1;
          if (!deletedSet.has(`t4-round-${r}-des`)) count += 1;
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
      roles: [Role.PM], title: '새로운 태스크', description: '', hasFile: true, completed_date: '00-00-00'
    };
    nextCustomTasks[stepId] = [...(nextCustomTasks[stepId] || []), newTask];
    const nextTaskOrder = { ...(currentProject.task_order || {}) };
    const currentOrder = nextTaskOrder[stepId] || getVisibleTasks(stepId, currentProject, rounds).map(t => t.id);
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
    if (stepId === 3 || stepId === 2) {
      const grouped: (Task | Task[])[] = [];
      let i = 0;
      while (i < allVisibleTasks.length) {
        const task = allVisibleTasks[i];
        // Regex to match t3-round-X-pm OR t2-round-X-prop
        const isRoundStart = task.id.match(/t[23]-round-\d+-(pm|prop)/);
        
        if (isRoundStart) {
          const next = allVisibleTasks[i + 1];
          // Check if next is the partner: pm->des OR prop->feed
          const partnerSuffix = task.id.includes('-pm') ? '-des' : '-feed';
          const currentSuffix = task.id.includes('-pm') ? '-pm' : '-prop';
          
          if (next && next.id === task.id.replace(currentSuffix, partnerSuffix)) {
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

  const handleSaveTaskInfo = (taskId: string, roles: Role[], title: string, description: string, completed_date: string) => {
    if (!currentProject || currentProject.is_locked) return;
    const nextCustomTasks = { ...(currentProject.custom_tasks || {}) };
    let found = false;
    for (const stepId in nextCustomTasks) {
      const idx = nextCustomTasks[stepId].findIndex(t => t.id === taskId);
      if (idx > -1) {
        nextCustomTasks[stepId][idx] = { ...nextCustomTasks[stepId][idx], roles, title, description, completed_date };
        found = true; break;
      }
    }
    if (!found) {
      for (const step of STEPS_STATIC) {
        const sTask = step.tasks.find(t => t.id === taskId);
        if (sTask) {
          const sid = step.id;
          if (!nextCustomTasks[sid]) nextCustomTasks[sid] = [];
          nextCustomTasks[sid].push({ ...sTask, roles, title, description, completed_date });
          found = true; break;
        }
      }
    }
    if (!found && (taskId.startsWith('t3-round-') || taskId.startsWith('t4-round-') || taskId.startsWith('t2-round-'))) {
      const isNav = taskId.startsWith('t2');
      const sid = isNav ? 2 : (taskId.startsWith('t3') ? 3 : 4);
      
      if (!nextCustomTasks[sid]) nextCustomTasks[sid] = [];
      
      let defaultTitle = '';
      let defaultRoles: Role[] = [];
      
      if (isNav) {
         const isProp = taskId.endsWith('-prop');
         const roundNum = taskId.split('-')[2];
         defaultTitle = isProp 
           ? `${roundNum}차 제안_버벌 아이덴티티 / 브랜드네임, 슬로건 등 도출_Ver${roundNum}.0` 
           : `${roundNum}차 제안에 대한 피드백`;
         defaultRoles = isProp ? [Role.PM, Role.DESIGNER] : [Role.CLIENT, Role.PM];
      } else {
        const isPm = taskId.endsWith('-pm');
        const roundNum = taskId.split('-')[2];
        defaultTitle = isPm ? `${roundNum}차 피드백 수급` : `${roundNum}차 수정 및 업데이트`;
        defaultRoles = isPm ? [Role.PM] : [Role.DESIGNER];
      }

      nextCustomTasks[sid].push({
        id: taskId,
        roles: roles && roles.length > 0 ? roles : defaultRoles,
        title: title || defaultTitle,
        description: description || '',
        completed_date: completed_date || '00-00-00'
      });
      found = true;
    }
    if (found) {
      const updatedProject = { ...currentProject, custom_tasks: nextCustomTasks, last_updated: new Date().toISOString() };
      updateProjectProgress(completedTasks, updatedProject);
      syncProjectToSupabase(updatedProject);
      showToast("태스크 정보 저장 완료");
    }
    setTaskEditPopover(prev => ({ ...prev, isOpen: false }));
  };

  const handleUpdateRounds2 = async (newCount: number) => {
    if (!currentProject || currentProject.is_locked) return;
    setRounds2(newCount);
    const updatedProject = { ...currentProject, rounds2_count: newCount, last_updated: new Date().toISOString() };
    setCurrentProject(updatedProject);
    const nextProjects = projects.map(p => p.id === currentProject.id ? updatedProject : p);
    setProjects(nextProjects);
    localStorage.setItem('grafy_projects', JSON.stringify(nextProjects));
    await syncProjectToSupabase(updatedProject);
    showToast(`Expedition 2 라운드가 ${newCount}개로 설정되었습니다.`);
  };

  const handleUpdateRoundsNavigation = async (newCount: number) => {
    if (!currentProject || currentProject.is_locked) return;
    setRoundsNavigation(newCount);
    const updatedProject = { ...currentProject, rounds_navigation_count: newCount, last_updated: new Date().toISOString() };
    setCurrentProject(updatedProject);
    const nextProjects = projects.map(p => p.id === currentProject.id ? updatedProject : p);
    setProjects(nextProjects);
    localStorage.setItem('grafy_projects', JSON.stringify(nextProjects));
    await syncProjectToSupabase(updatedProject);
    showToast(`Navigation 라운드가 ${newCount}개로 설정되었습니다.`);
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
      rounds_navigation_count: 1,
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
    updateProjectProgress(completedTasks, { ...currentProject });
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
      setSnapshotSelectedTasks(new Set(currentProject.client_visible_tasks || []));
      setIsSnapshotMode(true);
      showToast("클라이언트 스냅샷 모드가 활성화되었습니다.");
    } else {
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
    const updated = { ...currentProject, client_visible_tasks: visibleList, last_updated: new Date().toISOString() };
    setCurrentProject(updated);
    saveProjectsLocal(projects.map(p => p.id === currentProject.id ? updated : p));
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
      {/* DEBUG OVERLAY (Remove in production) */}
      <div className="fixed bottom-2 left-2 z-[9999] bg-black/80 text-white text-[10px] p-2 pointer-events-none rounded opacity-50">
        View: {currentView} | User: {user.userId} | Init: {isInitializing ? 'T' : 'F'} | Auth: {isAuthLoading ? 'T' : 'F'}
      </div>

      {isSnapshotMode && (
        <div className="fixed top-[72px] left-0 w-full z-30 bg-black text-white px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-3 shadow-md animate-in slide-in-from-top-2">
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

      {currentView === 'share' && sharedProjectId && (
        <SharedProjectView projectId={sharedProjectId} />
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
            user={user}
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
          <main className="w-full px-4 md:px-6 py-10 max-w-[2100px] mx-auto">
            <div className="max-w-[2100px] mx-auto">
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
                <div className="flex gap-2 md:gap-4 min-w-max md:min-w-0 md:w-full px-0">
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
                          setPopover({ isOpen: true, taskId: id, currentUrl: url || '', currentLabel: label || '', x: e.pageX, y: e.pageY });
                          setTaskEditPopover(p => ({ ...p, isOpen: false }));
                        }}
                        onEditContextMenu={(e, task) => {
                          if (isSnapshotMode) return;
                          setTaskEditPopover({
                            isOpen: true, taskId: task.id, roles: task.roles || [Role.PM], title: task.title, description: task.description || '', completed_date: task.completed_date || '00-00-00', x: e.pageX, y: e.pageY
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
                        {step.id === 2 && (
                          <div className="flex justify-center gap-4 md:gap-6 py-1">
                            <button
                              onClick={() => roundsNavigation > 1 && handleUpdateRoundsNavigation(roundsNavigation - 1)}
                              className={`w-10 h-10 md:w-12 md:h-12 rounded-full bg-white border border-slate-300 shadow-lg transition-all flex items-center justify-center text-black font-bold active:scale-90 ${currentProject?.is_locked || roundsNavigation <= 1 ? 'opacity-50 cursor-not-allowed' : 'hover:border-black'}`}
                              disabled={currentProject?.is_locked || roundsNavigation <= 1}
                            >
                              <i className="fa-solid fa-minus"></i>
                            </button>
                            <button
                              onClick={() => handleUpdateRoundsNavigation(roundsNavigation + 1)}
                              className={`w-10 h-10 md:w-12 md:h-12 rounded-full bg-black text-white shadow-lg transition-all flex items-center justify-center text-sm active:scale-90 ${currentProject?.is_locked ? 'opacity-50 cursor-not-allowed' : ''}`}
                              disabled={currentProject?.is_locked}
                            >
                              <i className="fa-solid fa-plus"></i>
                            </button>
                          </div>
                        )}
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
                        {step.id === 4 && (
                          <div className="flex justify-center gap-4 md:gap-6 py-1">
                            <button
                              onClick={() => rounds2 > 2 && handleUpdateRounds2(rounds2 - 1)}
                              className={`w-10 h-10 md:w-12 md:h-12 rounded-full bg-white border border-slate-300 shadow-lg transition-all flex items-center justify-center text-black font-bold active:scale-90 ${currentProject?.is_locked || rounds2 <= 2 ? 'opacity-50 cursor-not-allowed' : 'hover:border-black'}`}
                              disabled={currentProject?.is_locked || rounds2 <= 2}
                            >
                              <i className="fa-solid fa-minus"></i>
                            </button>
                            <button
                              onClick={() => handleUpdateRounds2(rounds2 + 1)}
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
          <div className={`fixed bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 text-white px-8 md:px-12 py-4 md:py-6 rounded-full text-sm md:text-[18px] font-bold z-[9999] shadow-2xl animate-in fade-in slide-in-from-bottom-10 duration-500 flex items-center gap-3 md:gap-4 ${
            toastMsg.includes("이전 스텝") ? "bg-red-500" : 
            toastMsg.includes("저장 완료") ? "bg-[#05D686]" : "bg-black"
          }`}>
            {toastMsg.includes("이전 스텝") ? <i className="fa-solid fa-circle-xmark text-white"></i> : 
             toastMsg.includes("저장 완료") ? <i className="fa-solid fa-circle-check text-white"></i> :
             <i className="fa-solid fa-circle-info text-white"></i>}
            {toastMsg}
          </div>
        )
      }
    </div >
  );
};

export default App;