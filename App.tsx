import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Navbar from "./components/Navbar.tsx";
import StepColumn from "./components/StepColumn.tsx";
import UrlPopover from "./components/UrlPopover.tsx";
import TaskEditPopover from "./components/TaskEditPopover.tsx";
import TaskCard from "./components/TaskCard.tsx";
import ProjectList from "./components/ProjectList.tsx";
import CreateProjectModal from "./components/CreateProjectModal.tsx";
import TeamManagementModal from "./components/TeamManagementModal.tsx";
import DeletedDataModal from "./components/DeletedDataModal.tsx";
import TemplateManagerModal from "./components/TemplateManagerModal.tsx";
import WelcomeScreen from "./components/WelcomeScreen.tsx";
import {
  supabase,
  isSupabaseReady,
  signInWithGoogle,
  signOut,
} from "./supabaseClient.ts";
import SharedProjectView from "./components/SharedProjectView.tsx";
import TemplateSaveModal from "./components/TemplateSaveModal.tsx";
import { createProjectFolder, completeProjectFolder, renameProjectFolder } from "./services/nasService";
import {
  STEPS_STATIC,
  TEAM_MEMBERS as INITIAL_TEAM_MEMBERS,
  STORAGE_BUCKET,
  DEFAULT_CUSTOM_TASKS,
  ADMIN_EMAILS,
} from "./constants.ts";
import {
  Role,
  Task,
  PopoverState,
  Project,
  User,
  TaskEditPopoverState,
  TeamMember,
} from "./types.ts";

import { Search, LayoutTemplate, Trash2, LogOut } from 'lucide-react';

// A "quiet" hover button component for the top menu
const QuietButton = ({ children, onClick }: { children?: React.ReactNode, onClick?: () => void }) => (
  <button 
    type="button"
    onClick={onClick}
    className="text-[25px] font-normal text-black hover:opacity-60 transition-opacity duration-200 whitespace-nowrap"
  >
    {children}
  </button>
);

// Filter Tab with Vertical Separator
const FilterTab = ({ label, isSelected, onClick, isFirst = false, isLast = false }: { label: string, isSelected?: boolean, onClick?: () => void, isFirst?: boolean, isLast?: boolean }) => (
  <div className="flex items-center h-[30px]">
    <button 
       type="button"
       onClick={onClick}
       className={`${isFirst ? 'pl-4 pr-5' : 'px-5'} h-full text-[15px] transition-opacity flex items-center whitespace-nowrap text-black ${isSelected ? 'font-semibold' : 'font-normal hover:opacity-60'}`}
    >
      {label}
    </button>
    {!isLast && <div className="h-3 w-px bg-black mx-0.5" />}
  </div>
);

// Grafy Logo SVG
const GrafyLogo = () => (
  <svg width="200" height="26" viewBox="0 0 200 26" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[150px] md:w-[200px] h-auto text-black fill-black">
    <title>Grafy</title>
    <path d="M14.3866 16.3675H22.7191C21.938 18.4818 19.1843 20.518 15.1678 20.518C10.2659 20.518 6.71158 17.3368 6.71158 12.9587C6.71158 8.5806 10.2659 5.49054 15.1678 5.49054C18.2079 5.49054 20.8378 6.6485 22.0421 8.50904L22.1202 8.63264H29.4242L29.3005 8.28135C27.5494 3.24618 21.9445 0 15.0376 0C6.321 0 0 5.45151 0 12.9522C0 20.4529 6.321 25.9044 15.0376 25.9044C23.7542 25.9044 29.9385 20.3358 29.9385 12.9522V11.2608H14.3931V16.361L14.3866 16.3675Z" fill="currentColor"/>
    <path d="M69.2973 9.15875C69.2973 3.88939 64.9357 0.617188 57.9182 0.617188H46.5391V25.3116H53.2507V17.6938H57.7424L63.0934 25.3116H70.9182L64.4084 16.4708C67.5722 15.0591 69.3038 12.47 69.3038 9.15875H69.2973ZM62.5857 9.15875C62.5857 11.9691 59.4935 12.3919 57.6448 12.3919H53.2507V5.93208H57.6448C59.487 5.93208 62.5857 6.35493 62.5857 9.16526V9.15875Z" fill="currentColor"/>
    <path d="M96.495 0.625L85.5586 25.3194H92.5241L94.451 20.6355H104.775L106.702 25.3194H114.176L103.259 0.625H96.5015H96.495ZM102.666 15.4182H96.5731L99.6197 7.98909L102.666 15.4182Z" fill="currentColor"/>
    <path d="M129.777 25.3194H136.489V16.0688H149.014V10.8515H136.489V5.90086H150.57V0.625H129.777V25.3194Z" fill="currentColor"/>
    <path d="M185.986 0.625L179.542 11.7622L173.071 0.625H165.383L175.916 17.539V25.3194H182.627V17.539L193.167 0.625H185.986Z" fill="currentColor"/>
    <path d="M196.582 25.3697C198.469 25.3697 199.999 23.8406 199.999 21.9544C199.999 20.0682 198.469 18.5391 196.582 18.5391C194.694 18.5391 193.164 20.0682 193.164 21.9544C193.164 23.8406 194.694 25.3697 196.582 25.3697Z" fill="currentColor"/>
  </svg>
);

const App: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('최근등록순');
  const [user, setUser] = useState<User>({
    id: "guest",
    userId: "guest",
    name: "게스트",
    avatarUrl: "",
  });
  const [currentView, setCurrentView] = useState<
    "welcome" | "list" | "detail" | "share"
  >("welcome");
  const [isInitializing, setIsInitializing] = useState(true);
  const isInitializingRef = React.useRef(isInitializing);
  const currentViewRef = React.useRef(currentView);
  const [sharedProjectId, setSharedProjectId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Project[]>([]); // Templates State
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [deletedProjects, setDeletedProjects] = useState<Project[]>([]); // Separated state for deleted projects
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isProjectLoading, setIsProjectLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showTemplateSaveModal, setShowTemplateSaveModal] = useState(false);
  const [showDeletedDataModal, setShowDeletedDataModal] = useState(false);
  const [showTemplateManagerModal, setShowTemplateManagerModal] =
    useState(false);
  const [activeRole, setActiveRole] = useState<Role>(Role.ALL);

  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [taskLinks, setTaskLinks] = useState<
    Map<string, { url: string; label: string }>
  >(new Map());
  const [rounds, setRounds] = useState<number>(2);
  const [rounds2, setRounds2] = useState<number>(2); // Expedition 2 rounds
  const [roundsNavigation, setRoundsNavigation] = useState<number>(2); // Navigation rounds (Step 2)
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(() => {
    return localStorage.getItem("grafy_logout_active") === "true";
  });
  const isLoggingOutRef = React.useRef(isLoggingOut);
  useEffect(() => {
    isLoggingOutRef.current = isLoggingOut;
  }, [isLoggingOut]);
  const isDataLoadedRef = React.useRef(false); // Track if initial data load is complete
  const realtimeRefreshRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchProjectsRef = React.useRef<(isBackground?: boolean) => void>(() => undefined);
  const fetchTeamMembersRef = React.useRef<() => void>(() => undefined);
  const loadTasksRef = React.useRef<(project: Project) => void>(() => undefined);
  const checkEmailAuthorizationRef = React.useRef<
    (email: string | undefined) => Promise<boolean>
  >(async () => false);
  const showToastRef = React.useRef<(msg: string) => void>(() => undefined);
  const updateProjectProgressRef = React.useRef<
    (
      nextCompleted: Set<string>,
      project: Project,
      nextLinks?: Map<string, { url: string; label: string }>,
    ) => Promise<void>
  >(async () => undefined);
  const saveProjectsLocalRef = React.useRef<
    (updatedActiveProjects: Project[]) => Promise<void>
  >(async () => undefined);
  const handleGroupTasksRef = React.useRef<() => Promise<void>>(
    async () => undefined,
  );
  const handleUngroupTasksRef = React.useRef<() => Promise<void>>(
    async () => undefined,
  );
  const calculateTotalTasksRef = React.useRef<
    (
      project: Project,
      overrideCompleted?: Set<string>,
      overrideCustomTasks?: any,
    ) => { total: number; completed: number }
  >(() => ({ total: 0, completed: 0 }));
  const [locationKey, setLocationKey] = useState(0); // Track URL changes  // State for popover in step 3
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Profile Menu Ref for click outside
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close profile menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    if (showProfileMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showProfileMenu]);

  const [popover, setPopover] = useState<PopoverState>({
    isOpen: false,
    taskId: null,
    currentUrl: "",
    currentLabel: "",
    x: 0,
    y: 0,
  });

  const [isSnapshotMode, setIsSnapshotMode] = useState(false);
  const [snapshotSelectedTasks, setSnapshotSelectedTasks] = useState<
    Set<string>
  >(new Set());

  const [taskEditPopover, setTaskEditPopover] = useState<TaskEditPopoverState>({
    isOpen: false,
    taskId: null,
    roles: [Role.PM],
    title: "",
    description: "",
    completed_date: "",
    x: 0,
    y: 0,
  });
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [confirmHideExpedition2, setConfirmHideExpedition2] = useState(false); // Expedition 2 숨기기 확인 상태


  // --- SAFEGUARDS ---
  // Force Welcome if Guest is on List
  // useEffect(() => {
  //   if (currentView === "list" && user.userId === "guest") {
  //     setCurrentView("welcome");
  //   }
  // }, [currentView, user.userId]);

  // Global Safety Timeout for Initialization
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isInitializing) {
      if (isInitializing) {
        setIsInitializing(false);
      }
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [isInitializing]);

  useEffect(() => {
    isInitializingRef.current = isInitializing;
  }, [isInitializing]);

  useEffect(() => {
    currentViewRef.current = currentView;
  }, [currentView]);

  // Listen for browser history changes (Back/Forward)
  useEffect(() => {
    const handlePopState = () => {
      setLocationKey((k) => k + 1);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);
  // ------------------

  useEffect(() => {
    let mounted = true;
    let authListener: any = null;

    const initAuth = async () => {
      if (!isSupabaseReady || !supabase) {
        if (mounted) setIsInitializing(false);
        return;
      }

      // 1. Shared Link Check
      const path = window.location.pathname;
      if (path.startsWith("/share/")) {
        const pid = path.split("/share/")[1];
        if (pid) {
          setSharedProjectId(pid);
          setCurrentView("share");
          setIsInitializing(false);
          return;
        }
      }


      // 2. Auth State Change Listener (Priority for maintaining session)
      const { data } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (!mounted) return;

          // FIX: Prevent view reset on token refresh
          if (event === "TOKEN_REFRESHED") return;

          if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
            if (session) {
              // Check Authorization
              const isAuthorized = await checkEmailAuthorizationRef.current(
                session.user.email,
              );
              if (!isAuthorized) {
                console.warn("Unauthorized user:", session.user.email);
                await supabase.auth.signOut();
                showToastRef.current("허가되지 않은 계정입니다.");
                setCurrentView("welcome");
                setIsInitializing(false);
                return;
              }

              // Success Login
              setUser({
                id: session.user.id,
                userId: session.user.id,
                name:
                  session.user.user_metadata.full_name ||
                  session.user.email?.split("@")[0] ||
                  "User",
                avatarUrl: session.user.user_metadata.avatar_url,
                email: session.user.email,
              });

              // Force Switch to List View after Login
              if (currentViewRef.current === "welcome") {
                setCurrentView("list");
              }

              // Fetch Data
              fetchTeamMembersRef.current();
              fetchProjectsRef.current();

              setIsAuthLoading(false);
              setIsInitializing(false);
            }
          } else if (event === "SIGNED_OUT") {
            if (mounted) {
              // Ensure logout flag is cleared when session is fully gone
              if (localStorage.getItem("grafy_logout_active") === "true") {
                // Keep the current view until handleLogout finishes the sequence
                if (!isLoggingOutRef.current) {
                  setCurrentView("welcome");
                }
                localStorage.removeItem("grafy_logout_active");
              } else if (!isLoggingOutRef.current) {
                // Typical sign out or session expiration
                setCurrentView("welcome");
              }
              setUser({
                id: "guest",
                userId: "guest",
                name: "게스트",
                avatarUrl: "",
              });
            }
          }
        },
      );
      authListener = data.subscription;

      // 3. Initial Session Check (Fast Path & Timeout Fallback)
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session && !window.location.hash.includes("access_token")) {
        // If no session immediately, give a small grace period for listener or recovery
        setTimeout(() => {
          if (mounted && isInitializingRef.current) {
            // Double check
            supabase.auth.getSession().then(({ data }) => {
              if (!data.session) {
                setCurrentView("welcome");
                setIsInitializing(false);
                setIsLoggingOut(false);
                localStorage.removeItem("grafy_logout_active");
              }
            });
          }
        }, 3000);
      }
    };

    // Initialize Storage Bucket
    const initializeStorage = async () => {
      if (!supabase) return;
      try {
        const { error } = await supabase.storage.getBucket(STORAGE_BUCKET);
        if (error && error.message.includes("not found")) {
          await supabase.storage.createBucket(STORAGE_BUCKET, {
            public: true,
            fileSizeLimit: 52428800,
          });
        }
      } catch (e) {
      }
    };

    initAuth();
    initializeStorage();

    return () => {
      mounted = false;
      if (authListener) authListener.unsubscribe();
    };
  }, []);

  // URL Search Params for Direct Project Navigation & History Handling
  useEffect(() => {
    if (locationKey < 0) return;
    const params = new URLSearchParams(window.location.search);
    const projectIdParam = params.get("project");

    // Wait until projects are loaded to perform selection
    if (!projects || projects.length === 0) return;

    if (projectIdParam) {
      const targetProject = projects.find((p) => p.id === projectIdParam);
      if (targetProject) {
        // Only trigger if the project actually changed (avoids infinite loops/redundant sets)
        if (currentProject?.id !== targetProject.id || currentView !== "detail") {
          // Manually apply state without pushState (since we're already handling a URL change)
          setCurrentProject(targetProject);
          setRounds(targetProject.rounds_count || 2);
          setRounds2(targetProject.rounds2_count || 2);
          setRoundsNavigation(targetProject.rounds_navigation_count || 2);
          loadTasksRef.current(targetProject);
          setCurrentView("detail");
          setActiveRole(Role.ALL);
        }
      } else {
        if (currentView !== "list") {
          setCurrentView("list");
          setCurrentProject(null);
        }
      }
    } else {
      // If no project param, ensure we are in the correct view
      // This handles the "Back" button from detail to list
      if (currentView === "detail") {
        setCurrentView("list");
        setCurrentProject(null);
      }
    }
  }, [projects, locationKey, currentProject?.id, currentView]); // Depend on projects load AND manual locationKey trigger

  // Initial View Setup based on URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const projectIdParam = params.get("project");
    if (projectIdParam) {
      // If URL has project, DO NOT start at 'welcome' or 'list' defaults if possible.
      // But we need auth first.
      // Let's rely on the Auth listener to set 'list', then the above effect to switch to 'detail'.
      // To prevent flash, we can suppress 'list' rendering if 'project' param exists until 'currentProject' is set.
    }
  }, []);

  // Force Background Color for List View to prevent white footer gap
  useEffect(() => {
    if (currentView === 'list' && !window.location.search.includes("project=")) {
      // Apply to both body and documentElement to ensure full coverage
      document.body.style.backgroundColor = '#F0EBE7';
      document.documentElement.style.backgroundColor = '#F0EBE7';
    } else {
      // Reset to default (or empty to let CSS take over)
      document.body.style.backgroundColor = '';
      document.documentElement.style.backgroundColor = '';
    }
    
    // Cleanup
    return () => {
      document.body.style.backgroundColor = '';
      document.documentElement.style.backgroundColor = '';
    };
  }, [currentView]);


  useEffect(() => {
    if (currentView !== "detail") return;
    const handlePointerDown = () => {
      setPopover((p) => ({ ...p, isOpen: false }));
      setTaskEditPopover((p) => ({ ...p, isOpen: false }));
    };
    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [currentView]);

  // Helper to check if email is allowed
  const checkEmailAuthorization = async (
    email: string | undefined,
  ): Promise<boolean> => {
    let bypassAuth = true;
    if (bypassAuth) return true;
    if (!email) return false;

    // 1. Check Constants (Fastest)
    const constantEmails = INITIAL_TEAM_MEMBERS.map((m) => m.email);
    if (constantEmails.includes(email)) return true;

    // 2. Check LocalStorage (Sync Fallback)
    const local = localStorage.getItem("grafy_team");
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (
          Array.isArray(parsed) &&
          parsed.some((m: TeamMember) => m.email === email)
        )
          return true;
      } catch (e) {
        console.warn("팀 명단 로컬 파싱 실패:", e);
      }
    }

    // 3. Check Supabase (Most Accurate)
    if (isSupabaseReady && supabase) {
      try {
        const { data, error } = await supabase
          .from("team_members")
          .select("email")
          .eq("email", email)
          .limit(1);
        if (data && data.length > 0) return true;
      } catch (e) {
        console.warn("팀 명단 권한 조회 실패:", e);
      }
    }

    return false;
  };

  checkEmailAuthorizationRef.current = checkEmailAuthorization;

  const handleGoogleLogin = async () => {
    try {
      const result: any = await signInWithGoogle();

      const sessionUser = result?.data?.session?.user;

      if (sessionUser) {
        // AUTHORIZATION CHECK
        const isAuthorized = await checkEmailAuthorization(sessionUser.email);
        if (!isAuthorized) {
          await handleLogout();
          showToast("허가되지 않은 계정입니다. 접근이 거부되었습니다.");
          return;
        }

        setUser({
          id: sessionUser.id,
          userId: sessionUser.id,
          name:
            sessionUser.user_metadata.full_name ||
            sessionUser.email?.split("@")[0] ||
            "사용자",
          avatarUrl: sessionUser.user_metadata.avatar_url,
          email: sessionUser.email,
        });
        setCurrentView("list");
        fetchTeamMembers();
        fetchProjects();
        showToast("성공적으로 로그인되었습니다.");
      } else if (result?.data?.url) {
      }
    } catch (error) {
      showToast("로그인 중 오류가 발생했습니다.");
    } finally {
      // If we didn't return early due to auth check, stop loading
      setTimeout(() => setIsAuthLoading(false), 3000);
    }
  };

  const handleAdminLogin = (userId: string, password: string) => {
    if (userId !== "admin" || password !== "rmfovlWkd!2026") {
      showToast("아이디 또는 비밀번호가 일치하지 않습니다.");
      return;
    }

    setUser({
      id: "local-admin",
      userId: "admin",
      name: "admin",
      avatarUrl: "",
      email: "ryan@grafydesign.com",
    });
    setCurrentView("list");
    fetchTeamMembers();
    fetchProjects();
    setIsAuthLoading(false);
    setIsInitializing(false);
    showToast("로컬 로그인되었습니다.");
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      localStorage.setItem("grafy_logout_active", "true");
      
      // We call signOut early but keep the view via the listener check
      await signOut();
      
      // Total 4 seconds sequence (2s backdrop + 1s text + 1s stay)
      setTimeout(() => {
        setCurrentView("welcome");
        setIsLoggingOut(false);
        localStorage.removeItem("grafy_logout_active");
      }, 4000);
    } catch (error) {
      setIsLoggingOut(false);
      localStorage.removeItem("grafy_logout_active");
      showToast("로그아웃 중 오류가 발생했습니다.");
    }
  };

  const buildInitialTeamMembers = (): TeamMember[] =>
    INITIAL_TEAM_MEMBERS.map((member, index) => ({
      id: `team-${index}`,
      name: member.name || "",
      title: member.title || "",
      phone: member.phone || "",
      email: member.email || "",
    }));

  const normalizeTeamMembers = (
    members: Array<Partial<TeamMember>>,
  ): TeamMember[] =>
    members.map((member, index) => ({
      id: member.id || `team-${index}`,
      name: member.name || "",
      title: member.title || "",
      phone: member.phone || "",
      email: member.email || "",
    }));

  const getLocalTeamMembers = (): TeamMember[] => {
    const savedTeam = localStorage.getItem("grafy_team");
    if (savedTeam) {
      try {
        const parsed = JSON.parse(savedTeam);
        if (Array.isArray(parsed)) {
          return normalizeTeamMembers(parsed);
        }
      } catch (e) {
        console.warn("팀 명단 로컬 로드 실패:", e);
      }
    }
    return buildInitialTeamMembers();
  };

  const syncTeamMembersToSupabase = async (members: TeamMember[]) => {
    if (!isSupabaseReady || !supabase) return null;

    const payload = members.map((member) => ({
      id: member.id,
      name: member.name,
      title: member.title,
      phone: member.phone,
      email: member.email,
    }));

    const { error } = await supabase
      .from("team_members")
      .upsert(payload, { onConflict: "id" });

    if (error) return error;

    const { data: existing, error: existingError } = await supabase
      .from("team_members")
      .select("id");

    if (existingError || !existing) return existingError || null;

    const keepIds = new Set(members.map((member) => member.id));
    const idsToDelete = existing
      .map((row) => row.id)
      .filter((id) => !keepIds.has(id));

    if (idsToDelete.length === 0) return null;

    const { error: deleteError } = await supabase
      .from("team_members")
      .delete()
      .in("id", idsToDelete);

    if (deleteError) return deleteError;

    return null;
  };

  const fetchTeamMembers = async () => {
    try {
      if (isSupabaseReady && supabase) {
        const { data, error } = await supabase
          .from("team_members")
          .select("id,name,title,phone,email");
        if (!error && data && data.length > 0) {
          const normalized = normalizeTeamMembers(data);
          setTeamMembers(normalized);
          localStorage.setItem("grafy_team", JSON.stringify(normalized));
          return;
        }

        const fallback = getLocalTeamMembers();
        setTeamMembers(fallback);
        localStorage.setItem("grafy_team", JSON.stringify(fallback));
        const syncError = await syncTeamMembersToSupabase(fallback);
        if (syncError) {
          console.warn("팀 명단 Supabase 동기화 실패:", syncError);
        }
        return;
      }

      const fallback = getLocalTeamMembers();
      setTeamMembers(fallback);
      localStorage.setItem("grafy_team", JSON.stringify(fallback));
    } catch (e) {
      console.warn("팀 명단 로드 실패:", e);
      const fallback = getLocalTeamMembers();
      setTeamMembers(fallback);
    }
  };

  fetchTeamMembersRef.current = fetchTeamMembers;

  const handleUpdateTeamMembers = async (members: TeamMember[]) => {
    const normalized = normalizeTeamMembers(members);
    setTeamMembers(normalized);
    localStorage.setItem("grafy_team", JSON.stringify(normalized));

    const syncError = await syncTeamMembersToSupabase(normalized);
    if (syncError) {
      console.error("팀 명단 Supabase 저장 실패:", syncError);
      showToast("팀 명단 저장 실패");
      return;
    }

    showToast("팀 정보가 잘 저장되었습니다 :)");
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  showToastRef.current = showToast;

  const fetchTemplates = async () => {
    if (isSupabaseReady && supabase) {
      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("status", -1)
        .order("created_at", { ascending: false });
      if (data) setTemplates(data);
    }
  };

  /* 
   * FIX: Modified to accept isBackground parameter.
   * If isBackground is true, or if we already have projects loaded,
   * we do NOT show the full screen loading spinner.
   */
  const fetchProjects = async (isBackground: boolean = false) => {
    // Show spinner ONLY if:
    // 1. Not explicitly a background request
    // 2. AND Data hasn't been loaded yet (checked via Ref)
    if (!isBackground && !isDataLoadedRef.current) {
      setIsProjectLoading(true);
    }
    
    try {
      let remoteData: Project[] = [];
      let localData: Project[] = [];
      let remoteTemplates: Project[] = [];

      // 1. Fetch Remote Projects (excluding templates)
      if (isSupabaseReady && supabase) {
        const { data, error } = await supabase
          .from("projects")
          .select("*")
          .neq("status", -1)
          .order("last_updated", { ascending: false });
        if (!error && data) {
          // Restore metadata if present
          remoteData = data.map((p: any) => {
            const meta = p.task_states?.meta;
            if (meta) {
              return {
                ...p,
                rounds_count: meta.rounds_count ?? p.rounds_count,
                rounds2_count: meta.rounds2_count ?? p.rounds2_count,
                rounds_navigation_count:
                  meta.rounds_navigation_count ?? p.rounds_navigation_count,
                client_visible_tasks:
                  meta.client_visible_tasks ?? p.client_visible_tasks,
                // Restore complex objects from meta backup
                custom_tasks: meta.custom_tasks ?? p.custom_tasks,
                task_order: meta.task_order ?? p.task_order,
                deleted_tasks: meta.deleted_tasks ?? p.deleted_tasks,
                template_name: meta.template_name ?? p.template_name, // Restore template_name
              };
            }
            return {
              ...p,
              template_name:
                p.task_states?.meta?.template_name ?? p.template_name,
            }; // Ensure template_name is set even if meta check fails above
          });
        }

        // Fetch Templates separately
        const { data: templateData, error: templateError } = await supabase
          .from("projects")
          .select("*")
          .eq("status", -1)
          .order("created_at", { ascending: false });
        if (!templateError && templateData) {
          remoteTemplates = templateData;
        }
      }

      // 2. Fetch Local
      const local = localStorage.getItem("grafy_projects");
      if (local) {
        const parsed = JSON.parse(local);
        localData = parsed.map((p: any) => ({
          ...p,
          template_name: p.template_name || p.task_states?.meta?.template_name, // Ensure local data also has template_name restored
        }));
      }

      // 3. Merge: Prefer Local if it has more critical info or is newer
      const mergedMap = new Map<string, Project>();
      remoteData.forEach((p) => {
        mergedMap.set(p.id, p);
      });

      for (const localP of localData) {
        if (localP.status === -1) continue; // Skip templates
        const remoteP = mergedMap.get(localP.id);
        if (!remoteP) {
          mergedMap.set(localP.id, localP);
          continue;
        }

        if (remoteP.status === -99) {
          mergedMap.set(localP.id, remoteP);
          continue;
        }

        const remoteNasTime = remoteP.nas_last_synced
          ? new Date(remoteP.nas_last_synced).getTime()
          : NaN;
        const localNasTime = localP.nas_last_synced
          ? new Date(localP.nas_last_synced).getTime()
          : NaN;
        const preferRemoteForNas =
          !isNaN(remoteNasTime) &&
          (isNaN(localNasTime) || remoteNasTime > localNasTime);
        if (preferRemoteForNas) continue;

        // Compare timestamps
        const remoteTime = new Date(remoteP.last_updated).getTime();
        const localTime = new Date(localP.last_updated).getTime();

        // Checking critical column loss in remote (specifically Navigation Rounds)
        const remoteMissingRounds =
          !remoteP.rounds_navigation_count ||
          remoteP.rounds_navigation_count === 1;
        const localHasRounds =
          localP.rounds_navigation_count &&
          localP.rounds_navigation_count > 1;

        // If Local is newer OR Remote is broken (missing rounds), use Local
        if (
          localTime >= remoteTime ||
          (remoteMissingRounds && localHasRounds)
        ) {
          mergedMap.set(localP.id, localP);
        }
      }

      const mergedList = Array.from(mergedMap.values()).sort(
        (a, b) =>
          new Date(b.last_updated).getTime() -
          new Date(a.last_updated).getTime(),
      );

      // Separate Active vs Deleted
      const active = mergedList.filter((p) => p.status !== -99);
      const deleted = mergedList.filter((p) => p.status === -99);

      setProjects(active);
      setDeletedProjects(deleted);
      setTemplates(remoteTemplates); // Set templates separately

      localStorage.setItem("grafy_projects", JSON.stringify(mergedList));

      if (currentProject) {
        const freshProject = mergedMap.get(currentProject.id);
        if (freshProject) {
          const freshTime = new Date(freshProject.last_updated).getTime();
          const currentTime = new Date(currentProject.last_updated).getTime();
          const freshNasTime = freshProject.nas_last_synced
            ? new Date(freshProject.nas_last_synced).getTime()
            : NaN;
          const currentNasTime = currentProject.nas_last_synced
            ? new Date(currentProject.nas_last_synced).getTime()
            : NaN;
          const shouldRefresh =
            (!isNaN(freshTime) && !isNaN(currentTime) && freshTime > currentTime) ||
            (!isNaN(freshNasTime) && (isNaN(currentNasTime) || freshNasTime > currentNasTime));
          if (shouldRefresh) {
            setCurrentProject(freshProject);
            loadTasksRef.current(freshProject);
          }
        }
      }
      
      // Mark data as loaded so subsequent fetches don't trigger spinner
      isDataLoadedRef.current = true;
    } catch (e) {
    }
    setIsProjectLoading(false);
  };

  useEffect(() => {
    fetchProjectsRef.current = fetchProjects;
  });

  useEffect(() => {
    if (!isSupabaseReady || !supabase) return;

    const channel = supabase
      .channel("projects-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
        () => {
          if (realtimeRefreshRef.current) {
            clearTimeout(realtimeRefreshRef.current);
          }
          realtimeRefreshRef.current = setTimeout(() => {
            fetchProjectsRef.current(true);
          }, 400);
        },
      )
      .subscribe();

    return () => {
      if (realtimeRefreshRef.current) {
        clearTimeout(realtimeRefreshRef.current);
        realtimeRefreshRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, []);


  const saveProjectsLocal = async (updatedActiveProjects: Project[]) => {
    setProjects(updatedActiveProjects);
    // Combine with deletedProjects for storage
    const allProjects = [...updatedActiveProjects, ...deletedProjects];
    localStorage.setItem("grafy_projects", JSON.stringify(allProjects));

    // Sync all updated projects to Supabase (Only recent one usually needed)
    if (isSupabaseReady && supabase) {
      try {
        const recentProject = updatedActiveProjects.reduce((latest, proj) => {
          if (!latest) return proj;
          return new Date(proj.last_updated) > new Date(latest.last_updated)
            ? proj
            : latest;
        }, updatedActiveProjects[0]);

        if (recentProject) {
          await syncProjectToSupabase(recentProject);
        }
      } catch (e) {
      }
    }
  };

  saveProjectsLocalRef.current = saveProjectsLocal;

  const syncProjectToSupabase = async (project: Project) => {
    if (isSupabaseReady && supabase) {
      // Explicitly define all fields to sync - ensures reliability
      const updateData = {
        id: project.id,
        // Project basic info
        name: project.name,
        start_date: project.start_date,
        end_date: project.end_date,
        status: project.status,
        is_locked: project.is_locked,
        last_updated: project.last_updated,
        created_at: project.created_at,

        // Worker info - CRITICAL for real-time sync
        pm_name: project.pm_name || "",
        pm_phone: project.pm_phone || "",
        pm_email: project.pm_email || "",
        designer_name: project.designer_name || "",
        designer_phone: project.designer_phone || "",
        designer_email: project.designer_email || "",
        designer_2_name: project.designer_2_name || "",
        designer_2_phone: project.designer_2_phone || "",
        designer_2_email: project.designer_2_email || "",
        designer_3_name: project.designer_3_name || "",
        designer_3_phone: project.designer_3_phone || "",
        designer_3_email: project.designer_3_email || "",

        // JSONB fields - Contains metadata, task states, etc.
        task_states: project.task_states || {
          completed: [],
          links: {},
          meta: {},
        },
      };

      const { error } = await supabase.from("projects").upsert(updateData);
      if (error) {
       // ERROR
      } else {
       // SUCCESS
      }
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    let targetProject = projects.find((p) => p.id === projectId);
    let isTemplate = false;

    if (!targetProject) {
      targetProject = templates.find((t) => t.id === projectId);
      isTemplate = true;
    }

    if (!targetProject) return;

    // Soft Delete: status -> -99
    const originalStatus = targetProject.status;
    const updatedProject: Project = {
      ...targetProject,
      status: -99,
      deleted_at: new Date().toISOString(),
      task_states: {
        ...targetProject.task_states!,
        meta: {
          ...targetProject.task_states?.meta,
          original_status: originalStatus, // Backup original status
        },
      },
      last_updated: new Date().toISOString(),
    };

    // Update States
    if (isTemplate) {
      const nextTemplates = templates.filter((t) => t.id !== projectId);
      setTemplates(nextTemplates);
    } else {
      const nextActive = projects.filter((p) => p.id !== projectId);
      setProjects(nextActive);
    }

    const nextDeleted = [updatedProject, ...deletedProjects];
    setDeletedProjects(nextDeleted);

    // Update Storage (Active + Deleted)
    // Note: LocalStorage mainly tracks 'grafy_projects'. Templates are re-fetched from Supabase usually,
    // but if we want to sync local state, we should know if templates are stored in 'grafy_projects' or not.
    // In fetchProjects, we separate them.

    // For now, update global storage with all non-template projects + deleted ones
    const activeProjects = isTemplate
      ? projects
      : projects.filter((p) => p.id !== projectId);
    localStorage.setItem(
      "grafy_projects",
      JSON.stringify([...activeProjects, ...nextDeleted]),
    );

    // Update Supabase
    await syncProjectToSupabase(updatedProject);
    showToast(
      isTemplate
        ? "템플릿이 삭제되었습니다."
        : "프로젝트가 삭제되었습니다 (복구 가능).",
    );
  };

  const handleRestoreProject = async (projectId: string) => {
    const targetProject = deletedProjects.find((p) => p.id === projectId);
    if (!targetProject) return;

    // Restore: status -> original_status or 0
    const originalStatus =
      targetProject.task_states?.meta?.original_status ?? 0;

    const updatedProject: Project = {
      ...targetProject,
      status: originalStatus,
      deleted_at: undefined, // Remove deleted flag
      last_updated: new Date().toISOString(),
    };

    // Update States
    const nextDeleted = deletedProjects.filter((p) => p.id !== projectId);
    const nextActive = [updatedProject, ...projects];

    setDeletedProjects(nextDeleted);
    setProjects(nextActive);

    // Update Storage
    localStorage.setItem(
      "grafy_projects",
      JSON.stringify([...nextActive, ...nextDeleted]),
    );

    // Update Supabase
    await syncProjectToSupabase(updatedProject);
    showToast("프로젝트가 복구되었습니다.");
  };

  const handleToggleLock = async (locked: boolean) => {
    if (!currentProject) return;

    let endDate = currentProject.end_date;
    if (locked) {
      const now = new Date();
      const yy = String(now.getFullYear()).slice(-2);
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      endDate = `${yy}${mm}${dd}`;
    }

    const updated = {
      ...currentProject,
      is_locked: locked,
      end_date: endDate,
      last_updated: new Date().toISOString(),
    };

    // UI 즉시 업데이트
    setCurrentProject(updated);
    const nextProjects = projects.map((p) =>
      p.id === currentProject.id ? updated : p,
    );
    setProjects(nextProjects);
    localStorage.setItem("grafy_projects", JSON.stringify(nextProjects));

    // Supabase 업데이트
    await syncProjectToSupabase(updated);

    // NAS 폴더명 변경 연동 (잠금 시에만)
    if (locked && updated.nas_folder_path) {
      try {
        showToast("🔄 NAS 폴더 종료일 업데이트 중...");
        const result = await completeProjectFolder(updated.id, updated.nas_folder_path);
        if (result.success) {
          // 변경된 경로 반영
          const finalProject = { ...updated, nas_folder_path: result.folderPath };
          setCurrentProject(finalProject);
          const finalProjects = projects.map((p) => (p.id === finalProject.id ? finalProject : p));
          setProjects(finalProjects);
          localStorage.setItem("grafy_projects", JSON.stringify(finalProjects));
          
          if (isSupabaseReady && supabase) {
            await supabase.from("projects").update({ nas_folder_path: result.folderPath }).eq("id", finalProject.id);
          }
          showToast("✅ NAS 폴더 종료일 반영 완료");
        }
      } catch (err: any) {
        console.error("NAS 완료 처리 실패:", err);
        showToast(`⚠️ NAS 연동 실패: ${err.message}`);
      }
    } else {
      showToast(locked ? "프로젝트가 잠겼습니다." : "프로젝트 잠금이 해제되었습니다.");
    }
  };

  const selectProject = (project: Project) => {
    // Update URL to support persistence and sharing
    const newUrl = `${window.location.pathname}?project=${project.id}`;
    window.history.pushState({ projectId: project.id }, "", newUrl);

    setCurrentProject(project);
    setRounds(project.rounds_count || 2);
    setRounds2(project.rounds2_count || 2);
    setRoundsNavigation(project.rounds_navigation_count || 2);
    loadTasksRef.current(project);
    setCurrentView("detail");
    setActiveRole(Role.ALL);
  };

  const loadTasks = (project: Project) => {
    if (project.task_states) {
      setCompletedTasks(new Set<string>(project.task_states.completed || []));
      const linkMap = new Map<string, { url: string; label: string }>();
      Object.entries(project.task_states.links || {}).forEach(
        ([id, val]: [string, any]) => {
          linkMap.set(id, val);
        },
      );
      setTaskLinks(linkMap);
      return;
    }

    const localTasks = localStorage.getItem(`tasks_${project.id}`);
    if (localTasks) {
      const parsed = JSON.parse(localTasks);
      setCompletedTasks(new Set<string>(parsed.completed || []));
      const linkMap = new Map<string, { url: string; label: string }>();
      Object.entries(parsed.links || {}).forEach(([id, val]: [any, any]) => {
        linkMap.set(id, val);
      });
      setTaskLinks(linkMap);
    } else {
      setCompletedTasks(new Set<string>());
      setTaskLinks(new Map<string, { url: string; label: string }>());
    }
  };

  loadTasksRef.current = loadTasks;


  const syncTasks = (
    project: Project,
    completed: Set<string>,
    links: Map<string, { url: string; label: string }>,
  ) => {
    localStorage.setItem(
      `tasks_${project.id}`,
      JSON.stringify({
        completed: Array.from(completed),
        links: Object.fromEntries(links),
      }),
    );
  };

  const shouldUpdateNasFolder = (updates: Partial<Project>) => {
    const keys: (keyof Project)[] = [
      "name",
      "start_date",
      "end_date",
      "pm_name",
      "designer_name",
      "designer_2_name",
      "designer_3_name",
    ];
    return keys.some((key) => key in updates);
  };

  const updateProjectInfo = async (updates: Partial<Project>) => {
    if (!currentProject || currentProject.is_locked) return;

    // Sync updates to meta for backup & realtime trigger assurance
    const updatedMeta = {
      ...(currentProject.task_states?.meta || {}),
      ...updates,
    };

    const updatedTaskStates = {
      ...(currentProject.task_states || { completed: [], links: {}, meta: {} }),
      meta: updatedMeta,
    };

    const updatedProject = {
      ...currentProject,
      ...updates,
      task_states: updatedTaskStates,
      last_updated: new Date().toISOString(),
    };
    setCurrentProject(updatedProject);

    // Update projects array
    const updatedProjects = projects.map((p) =>
      p.id === currentProject.id ? updatedProject : p,
    );
    setProjects(updatedProjects);

    // Save to localStorage
    localStorage.setItem("grafy_projects", JSON.stringify(updatedProjects));

    // Sync to Supabase
    await syncProjectToSupabase(updatedProject);

    if (shouldUpdateNasFolder(updates) && updatedProject.nas_folder_path) {
      try {
        const result = await renameProjectFolder(
          updatedProject.id,
          updatedProject.nas_folder_path,
          {
            name: updatedProject.name,
            startDate: updatedProject.start_date,
            endDate: updatedProject.end_date,
            pmName: updatedProject.pm_name,
            designerNames: [
              updatedProject.designer_name,
              updatedProject.designer_2_name,
              updatedProject.designer_3_name,
            ].filter(Boolean),
          },
          updatedProject.last_updated,
        );

        if (result?.success && result.folderPath && result.folderPath !== updatedProject.nas_folder_path) {
          const finalProject = { ...updatedProject, nas_folder_path: result.folderPath };
          setCurrentProject(finalProject);
          const finalProjects = projects.map((p) => (p.id === finalProject.id ? finalProject : p));
          setProjects(finalProjects);
          localStorage.setItem("grafy_projects", JSON.stringify(finalProjects));

          if (isSupabaseReady && supabase) {
            await supabase
              .from("projects")
              .update({ nas_folder_path: result.folderPath, last_updated: finalProject.last_updated })
              .eq("id", finalProject.id);
          }
        }
      } catch (err: any) {
        console.error("NAS 이름 변경 실패:", err);
        showToast(`⚠️ NAS 이름 변경 실패: ${err.message}`);
      }
    }

    showToast("프로젝트 정보 저장 완료");
  };

  const getVisibleTasks = useCallback((
    stepId: number,
    project: Project,
    roundCount: number,
  ) => {
    const stepCustomTasks = project.custom_tasks?.[stepId] || [];
    const deletedSet = new Set(project.deleted_tasks || []);
    let allVisibleTasks: Task[] = [];

    // 🔥 Helper functions for dynamic round task generation
    const createStep2RoundTask = (taskId: string): Task | null => {
      const match = taskId.match(/^t2-round-(\d+)-(prop|feed)$/);
      if (!match) return null;
      
      const roundNum = parseInt(match[1]);
      const type = match[2];
      
      if (type === 'prop') {
        return {
          id: taskId,
          roles: [Role.PM, Role.DESIGNER],
          title: `${roundNum}차 제안_버벌 아이덴티티 / 브랜드네임, 슬로건 등 도출_Ver${roundNum}.0`,
          description: "시장 조사, 기획, 디자인 원칙, 전체적인 비주얼아이덴티티 도출을 위한 맥락 등의 디자인 소스를 제작",
          completed_date: "00-00-00",
        };
      } else {  // feed
        return {
          id: taskId,
          roles: [Role.CLIENT, Role.PM],
          title: `${roundNum}차 제안에 대한 피드백`,
          description: "( 초기 스냅샷 금지 ) 피드백을 확인할 수 있습니다",
          completed_date: "00-00-00",
        };
      }
    };

    const createStep3RoundTask = (taskId: string): Task | null => {
      const match = taskId.match(/^t3-round-(\d+)-(pm|des)$/);
      if (!match) return null;
      
      const roundNum = parseInt(match[1]);
      const type = match[2];
      
      if (type === 'pm') {
        return {
          id: taskId,
          roles: [Role.PM],
          title: `${roundNum}차 피드백 수급`,
          completed_date: "00-00-00",
        };
      } else {  // des
        return {
          id: taskId,
          roles: [Role.DESIGNER],
          title: `${roundNum}차 수정 및 업데이트`,
          completed_date: "00-00-00",
        };
      }
    };

    // 🔥 NEW LOGIC: Step 2/3 now use task_order as Step 1/4/5 do
    if (stepId === 2) {
      const order = project.task_order?.[stepId];
      
      if (order && order.length > 0) {
        // ✅ task_order 우선 방식 (Step 1/4/5와 동일)
        allVisibleTasks = order
          .map(taskId => {
            // 1. custom_tasks에서 찾기
            let task = stepCustomTasks.find(ct => ct.id === taskId);
            if (task && !deletedSet.has(taskId)) return task;
            
            // 2. 라운드 태스크 동적 생성
            if (taskId.match(/^t2-round-\d+-(prop|feed)$/)) {
              if (!deletedSet.has(taskId)) {
                return createStep2RoundTask(taskId);
              }
            }
            
            return null;
          })
          .filter((t): t is Task => t !== null);
        
        // task_order에 없는 custom tasks 추가 (맨 뒤)
        const tasksInOrder = new Set(order);
        const extraCustoms = stepCustomTasks.filter(
          ct => !tasksInOrder.has(ct.id) && !deletedSet.has(ct.id)
        );
        allVisibleTasks = [...allVisibleTasks, ...extraCustoms];
        
      } else {
        // Fallback: task_order가 없을 때 (초기 프로젝트)
        const navRoundCount = project.rounds_navigation_count || 1;
        const roundTasks = Array.from({ length: navRoundCount }).flatMap(
          (_, rIdx) => {
            const propId = `t2-round-${rIdx + 1}-prop`;
            const feedId = `t2-round-${rIdx + 1}-feed`;
            const rTs = [];
            if (!deletedSet.has(propId)) {
              rTs.push(
                stepCustomTasks.find((ct) => ct.id === propId) || {
                  id: propId,
                  roles: [Role.PM, Role.DESIGNER],
                  title: `${rIdx + 1}차 제안_버벌 아이덴티티 / 브랜드네임, 슬로건 등 도출_Ver${rIdx + 1}.0`,
                  description:
                    "시장 조사, 기획, 디자인 원칙, 전체적인 비주얼아이덴티티 도출을 위한 맥락 등의 디자인 소스를 제작",
                  completed_date: "00-00-00",
                },
              );
            }
            if (!deletedSet.has(feedId)) {
              rTs.push(
                stepCustomTasks.find((ct) => ct.id === feedId) || {
                  id: feedId,
                  roles: [Role.CLIENT, Role.PM],
                  title: `${rIdx + 1}차 제안에 대한 피드백`,
                  description:
                    "( 초기 스냅샷 금지 ) 1차 피드백을 확인할 수 있습니다",
                  completed_date: "00-00-00",
                },
              );
            }
            return rTs;
          },
        );
        const onlyCustoms = stepCustomTasks.filter(
          (ct) => !ct.id.includes("-round-"),
        );
        allVisibleTasks = [...roundTasks, ...onlyCustoms];
      }
    } else if (stepId === 3) {
      const order = project.task_order?.[stepId];
      
      if (order && order.length > 0) {
        // ✅ task_order 우선 방식
        allVisibleTasks = order
          .map(taskId => {
            // 1. custom_tasks에서 찾기
            let task = stepCustomTasks.find(ct => ct.id === taskId);
            if (task && !deletedSet.has(taskId)) return task;
            
            // 2. 라운드 태스크 동적 생성
            if (taskId.match(/^t3-round-\d+-(pm|des)$/)) {
              if (!deletedSet.has(taskId)) {
                return createStep3RoundTask(taskId);
              }
            }
            
            // 3. Static tasks (t3-base-1, t3-final)
            if (taskId === 't3-base-1' && !deletedSet.has(taskId)) {
              const baseTask = STEPS_STATIC[2].tasks[0];
              return stepCustomTasks.find(t => t.id === 't3-base-1') || baseTask;
            }
            if (taskId === 't3-final' && !deletedSet.has(taskId)) {
              const finalTask = STEPS_STATIC[2].tasks[1];
              return stepCustomTasks.find(t => t.id === 't3-final') || finalTask;
            }
            
            return null;
          })
          .filter((t): t is Task => t !== null);
        
        // task_order에 없는 custom tasks 추가
        const tasksInOrder = new Set(order);
        const extraCustoms = stepCustomTasks.filter(
          ct => !tasksInOrder.has(ct.id) && !deletedSet.has(ct.id) &&
               !['t3-base-1', 't3-final'].includes(ct.id) &&
               !ct.id.includes('-round-')
        );
        allVisibleTasks = [...allVisibleTasks, ...extraCustoms];
        
      } else {
        // Fallback: task_order가 없을 때
        const navRoundCount = project.rounds_navigation_count || 1;
        const baseTask = STEPS_STATIC[2].tasks[0];
        const finalTask = STEPS_STATIC[2].tasks[1];
        const roundTasks = Array.from({ length: navRoundCount }).flatMap(
          (_, rIdx) => {
            const pmId = `t3-round-${rIdx + 1}-pm`;
            const desId = `t3-round-${rIdx + 1}-des`;
            const rTs = [];
            if (!deletedSet.has(pmId))
              rTs.push(
                stepCustomTasks.find((ct) => ct.id === pmId) || {
                  id: pmId,
                  role: Role.PM,
                  title: `${rIdx + 1}차 피드백 수급`,
                  completed_date: "00-00-00",
                },
              );
            if (!deletedSet.has(desId))
              rTs.push(
                stepCustomTasks.find((ct) => ct.id === desId) || {
                  id: desId,
                  role: Role.DESIGNER,
                  title: `${rIdx + 1}차 수정 및 업데이트`,
                  completed_date: "00-00-00",
                },
              );
            return rTs;
          },
        );

        const onlyCustoms = stepCustomTasks.filter(
          (ct) =>
            !["t3-base-1", "t3-final"].includes(ct.id) &&
            !ct.id.includes("-round-"),
        );

        if (!deletedSet.has("t3-base-1"))
          allVisibleTasks.push(
            stepCustomTasks.find((t) => t.id === "t3-base-1") || baseTask,
          );
        allVisibleTasks = [...allVisibleTasks, ...roundTasks, ...onlyCustoms];
        if (!deletedSet.has("t3-final"))
          allVisibleTasks.push(
            stepCustomTasks.find((t) => t.id === "t3-final") || finalTask,
          );
      }
    } else if (stepId === 4) {
      const roundCount2 = project.rounds2_count || 2;
      const roundTasks = Array.from({ length: roundCount2 }).flatMap(
        (_, rIdx) => {
          const pmId = `t4-round-${rIdx + 1}-pm`;
          const desId = `t4-round-${rIdx + 1}-des`;
          const rTs = [];
          if (!deletedSet.has(pmId))
            rTs.push(
              stepCustomTasks.find((ct) => ct.id === pmId) || {
                id: pmId,
                roles: [Role.PM],
                title: `${rIdx + 1}차 피드백 수급`,
                completed_date: "00-00-00",
              },
            );
          if (!deletedSet.has(desId))
            rTs.push(
              stepCustomTasks.find((ct) => ct.id === desId) || {
                id: desId,
                roles: [Role.DESIGNER],
                title: `${rIdx + 1}차 수정 및 업데이트`,
                completed_date: "00-00-00",
              },
            );
          return rTs;
        },
      );
      const onlyCustoms = stepCustomTasks.filter(
        (ct) => !ct.id.includes("-round-"),
      );
      allVisibleTasks = [...roundTasks, ...onlyCustoms];
    } else {
      const stepStaticTasks =
        STEPS_STATIC.find((s) => s.id === stepId)?.tasks || [];
      allVisibleTasks = stepStaticTasks
        .filter((st) => !deletedSet.has(st.id))
        .map((st) => stepCustomTasks.find((ct) => ct.id === st.id) || st);
      const onlyCustoms = stepCustomTasks.filter(
        (ct) => !stepStaticTasks.some((st) => st.id === ct.id),
      );
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
  }, []);

  const isLockedStep = useCallback((stepId: number): boolean => {
    if (stepId === 1 || !currentProject) return false;

    // Special handling for Step 5 (Landing) when Expedition 2 is hidden
    const isExpedition2Hidden =
      currentProject?.task_states?.meta?.is_expedition2_hidden;
    if (stepId === 5 && isExpedition2Hidden) {
      // If Expedition 2 is hidden, check Step 3 (Expedition 1) instead
      const step3Tasks = getVisibleTasks(3, currentProject, rounds);
      return !step3Tasks.every((t) => completedTasks.has(t.id));
    }

    const prevStepId = stepId - 1;
    const prevVisibleTasks = getVisibleTasks(
      prevStepId,
      currentProject,
      rounds,
    );
    return !prevVisibleTasks.every((t) => completedTasks.has(t.id));
  }, [currentProject, completedTasks, rounds, getVisibleTasks]);

  const findTaskInProject = useCallback((taskId: string): Task | null => {
    if (!currentProject) return null;
    const nextCustomTasks = currentProject.custom_tasks || {};
    for (const stepId in nextCustomTasks) {
      const found = nextCustomTasks[stepId].find((t) => t.id === taskId);
      if (found) return found;
    }
    for (const step of STEPS_STATIC) {
      const found = step.tasks.find((t) => t.id === taskId);
      if (found) return found;
    }
    return null;
  }, [currentProject]);

  const handleToggleTask = (taskId: string) => {
    if (!currentProject || currentProject.is_locked) return;
    const isNowChecking = !completedTasks.has(taskId);

    let taskStepId = 0;
    if (taskId.startsWith("t")) taskStepId = parseInt(taskId[1]);
    else if (taskId.startsWith("custom"))
      taskStepId = parseInt(taskId.split("-")[1]);

    if (isNowChecking) {
      const nextCompleted = new Set<string>(completedTasks);
      nextCompleted.add(taskId);
      setCompletedTasks(nextCompleted);

      const currentTaskData = findTaskInProject(taskId);
      if (
        !currentTaskData?.completed_date ||
        currentTaskData.completed_date === "00-00-00"
      ) {
        const now = new Date();
        const yy = String(now.getFullYear()).slice(-2);
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const dd = String(now.getDate()).padStart(2, "0");
        const autoDate = `${yy}-${mm}-${dd}`;
        handleAutoSetTaskDate(taskId, autoDate, nextCompleted);
      } else {
        updateProjectProgress(nextCompleted, currentProject);
      }
    } else {
      const nextCompleted = new Set<string>(completedTasks);
      nextCompleted.delete(taskId);
      setCompletedTasks(nextCompleted);
      updateProjectProgress(nextCompleted, currentProject);
    }
  };

  const handleDeleteTask = useCallback((taskId: string) => {
    if (!currentProject || currentProject.is_locked) return;
    const nextCustomTasks = { ...(currentProject.custom_tasks || {}) };
    const nextTaskOrder = { ...(currentProject.task_order || {}) };
    const nextDeletedTasks = [...(currentProject.deleted_tasks || [])];
    let found = false;

    for (const stepId in nextCustomTasks) {
      const originalLen = nextCustomTasks[stepId].length;
      nextCustomTasks[stepId] = nextCustomTasks[stepId].filter(
        (t) => t.id !== taskId,
      );
      if (nextCustomTasks[stepId].length !== originalLen) found = true;
      if (nextTaskOrder[stepId])
        nextTaskOrder[stepId] = nextTaskOrder[stepId].filter(
          (id) => id !== taskId,
        );
    }
    if (taskId.startsWith("t")) {
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
        last_updated: new Date().toISOString(),
      };
      // Explicitly update local state first
      setCurrentProject(updatedProject);
      const nextProjects = projects.map((p) =>
        p.id === currentProject.id ? updatedProject : p,
      );
      setProjects(nextProjects);
      localStorage.setItem("grafy_projects", JSON.stringify(nextProjects));

      updateProjectProgressRef.current(nextCompleted, updatedProject);
      showToastRef.current("태스크가 삭제되었습니다.");
    }
  }, [currentProject, completedTasks, projects]);



  const handleAutoSetTaskDate = (
    taskId: string,
    date: string,
    nextCompleted: Set<string>,
  ) => {
    if (!currentProject) return;
    const nextCustomTasks = { ...(currentProject.custom_tasks || {}) };
    let found = false;
    for (const stepId in nextCustomTasks) {
      const idx = nextCustomTasks[stepId].findIndex((t) => t.id === taskId);
      if (idx > -1) {
        nextCustomTasks[stepId][idx] = {
          ...nextCustomTasks[stepId][idx],
          completed_date: date,
        };
        found = true;
        break;
      }
    }
    if (!found) {
      for (const step of STEPS_STATIC) {
        const sTask = step.tasks.find((t) => t.id === taskId);
        if (sTask) {
          const sid = step.id;
          if (!nextCustomTasks[sid]) nextCustomTasks[sid] = [];
          nextCustomTasks[sid].push({ ...sTask, completed_date: date });
          found = true;
          break;
        }
      }
    }
    const updatedProject = {
      ...currentProject,
      custom_tasks: nextCustomTasks,
      last_updated: new Date().toISOString(),
    };
    updateProjectProgress(nextCompleted, updatedProject);
  };

  const updateProjectProgress = useCallback(async (
    nextCompleted: Set<string>,
    project: Project,
    nextLinks?: Map<string, { url: string; label: string }>,
  ) => {
    const currentLinks = nextLinks || taskLinks;
    const totalObj = calculateTotalTasksRef.current(project, nextCompleted);
    const percent =
      totalObj.total === 0 ? 0 : Math.round((totalObj.completed / totalObj.total) * 100);
    const task_states = {
      completed: Array.from(nextCompleted),
      links: Object.fromEntries(currentLinks),
      meta: {
        rounds_count: project.rounds_count,
        rounds2_count: project.rounds2_count,
        rounds_navigation_count: project.rounds_navigation_count,
        client_visible_tasks: project.client_visible_tasks,
        // Backup complex objects in meta
        custom_tasks: project.custom_tasks,
        task_order: project.task_order,
        deleted_tasks: project.deleted_tasks,
        is_expedition2_hidden: project.task_states?.meta?.is_expedition2_hidden,
        step_titles: project.task_states?.meta?.step_titles,
        task_groups: project.task_states?.meta?.task_groups,
        template_name:
          project.template_name || project.task_states?.meta?.template_name,
      },
    };
    const updatedProject = {
      ...project,
      status: Math.min(100, percent),
      last_updated: new Date().toISOString(),
      task_states,
    };
    setCurrentProject(updatedProject);
    saveProjectsLocalRef.current(
      projects.map((p) => (p.id === project.id ? updatedProject : p)),
    );

    // Explicitly update Supabase to ensure all fields are saved
    if (isSupabaseReady && supabase) {
      try {
        await supabase
          .from("projects")
          .update({
            task_states: updatedProject.task_states,
            custom_tasks: updatedProject.custom_tasks,
            task_order: updatedProject.task_order,
            status: updatedProject.status,
            last_updated: updatedProject.last_updated,
            client_visible_tasks: updatedProject.client_visible_tasks,
            // Removing rounds_* and deleted_tasks columns as they might not exist in DB schema,
            // causing the entire update to fail. They are backed up in task_states.meta.
          })
          .eq("id", updatedProject.id);
      } catch (err) {
      }
    }
  }, [projects, taskLinks]);

  updateProjectProgressRef.current = updateProjectProgress;

  const calculateTotalTasks = useCallback((
    project: Project,
    overrideCompleted?: Set<string>,
    overrideCustomTasks?: any
  ) => {
    let total = 0;
    let completed = 0;
    const completedSet =
      overrideCompleted || new Set(project.task_states?.completed || []);
    
    // Create a temporary project object for getVisibleTasks to use
    const tempProject = {
      ...project,
      custom_tasks: overrideCustomTasks || project.custom_tasks || {},
    };

    STEPS_STATIC.forEach((step) => {
      // Step 4 hidden check
      if (
        step.id === 4 &&
        tempProject.task_states?.meta?.is_expedition2_hidden
      ) {
        return;
      }

      // Step 2, 3, 4 have rounds-based tasks
      const roundCount =
        step.id === 2
          ? tempProject.rounds_navigation_count || 1
          : step.id === 3
          ? tempProject.rounds_count || 2
          : tempProject.rounds2_count || 2;

      const visibleTasks = getVisibleTasks(step.id, tempProject, roundCount);
      
      visibleTasks.forEach((task) => {
        total += 1;
        if (completedSet.has(task.id)) {
          completed += 1;
        }
      });
    });

    return { total, completed };
  }, [getVisibleTasks]);

  calculateTotalTasksRef.current = calculateTotalTasks;

  const handleUpdateRounds = async (newRounds: number) => {
    if (!currentProject || currentProject.is_locked) return;
    setRounds(newRounds);

    const updatedProject = {
      ...currentProject,
      rounds_count: newRounds,
      last_updated: new Date().toISOString(),
    };

    // Explicitly update local state first
    setCurrentProject(updatedProject);
    const nextProjects = projects.map((p) =>
      p.id === currentProject.id ? updatedProject : p,
    );
    setProjects(nextProjects);
    localStorage.setItem("grafy_projects", JSON.stringify(nextProjects));

    // Then sync and update progress
    await updateProjectProgress(completedTasks, updatedProject);
    showToast(`Expedition 1 라운드가 ${newRounds}개로 설정되었습니다.`);
  };

  const handleAddCustomTask = (stepId: number) => {
    if (!currentProject || currentProject.is_locked) return;
    const nextCustomTasks = { ...(currentProject.custom_tasks || {}) };
    const newTask: Task = {
      id: `custom-${stepId}-${Date.now()}`,
      roles: [Role.PM],
      title: "새로운 태스크",
      description: "",
      hasFile: true,
      completed_date: "00-00-00",
    };
    
    // 1. Add to custom tasks
    nextCustomTasks[stepId] = [...(nextCustomTasks[stepId] || []), newTask];

    // 2. Determine new task order (FORCE APPEND AT THE END OF VISIBLE LIST)
    const currentVisibleTasks = getVisibleTasks(stepId, { ...currentProject, custom_tasks: nextCustomTasks }, rounds);
    const nextTaskOrder = { ...(currentProject.task_order || {}) };
    nextTaskOrder[stepId] = currentVisibleTasks.map(t => t.id);

    const updatedProject = {
      ...currentProject,
      custom_tasks: nextCustomTasks,
      task_order: nextTaskOrder,
      last_updated: new Date().toISOString(),
    };

    // Explicitly update local state first
    setCurrentProject(updatedProject);
    const nextProjects = projects.map((p) =>
      p.id === currentProject.id ? updatedProject : p,
    );
    setProjects(nextProjects);
    localStorage.setItem("grafy_projects", JSON.stringify(nextProjects));

    updateProjectProgress(completedTasks, updatedProject);
    showToast("태스크가 추가되었습니다.");
  };

  const handleUpdateGroupTitle = async (stepId: number, groupId: string, newTitle: string) => {
    if (!currentProject) return;
    const nextMeta = { ...(currentProject.task_states?.meta || {}) };
    const stepGroups = [...(nextMeta.task_groups?.[stepId] || [])];
    const gIdx = stepGroups.findIndex(g => g.id === groupId);
    if (gIdx > -1) {
      stepGroups[gIdx] = { ...stepGroups[gIdx], title: newTitle };
      nextMeta.task_groups = { ...nextMeta.task_groups, [stepId]: stepGroups };
      
      const updatedProject = {
        ...currentProject,
        task_states: { ...currentProject.task_states, meta: nextMeta }
      };
      setCurrentProject(updatedProject);
      await syncProjectToSupabase(updatedProject);
    }
  };

  const handleGroupTasks = async () => {
    if (!currentProject || selectedTaskIds.size < 2) {
      if (selectedTaskIds.size === 1) showToast("두 개 이상의 태스크를 선택해야 그룹화할 수 있습니다.");
      return;
    }

    // Identify which step these tasks belong to (must be in the same step)
    let targetStepId: number | null = null;
    const selectedArray = Array.from(selectedTaskIds);
    
    // Simple heuristic: check all steps' current visible tasks
    for (const step of STEPS_STATIC) {
      const vTasks = getVisibleTasks(step.id, currentProject, rounds);
      const visibleIds = vTasks.map(t => t.id);
      if (selectedArray.every((id: string) => visibleIds.includes(id))) {
        targetStepId = step.id;
        break;
      }
    }

    if (!targetStepId) {
      showToast("동일한 스텝 내의 태스크들만 그룹화할 수 있습니다.");
      return;
    }

    const nextMeta = { ...(currentProject.task_states?.meta || {}) };
    const nextGroups = { ...(nextMeta.task_groups || {}) };
    if (!nextGroups[targetStepId]) nextGroups[targetStepId] = [];

    // Check if any selected task is already in another group
    const alreadyInGroup = selectedArray.some(taskId => 
      nextGroups[targetStepId!].some((g: any) => (g.taskIds || []).includes(taskId))
    );

    if (alreadyInGroup) {
      showToast("이미 그룹에 포함된 태스크가 있습니다. 이전 그룹을 해제하고 다시 시도해 주세요.");
      return;
    }

    const newGroupId = `group-${Date.now()}`;
    nextGroups[targetStepId].push({
      id: newGroupId,
      title: "새 폴더",
      taskIds: selectedArray
    });

    nextMeta.task_groups = nextGroups;
    const updatedProject = {
      ...currentProject,
      task_states: { ...currentProject.task_states, meta: nextMeta }
    };
    
    setCurrentProject(updatedProject);
    setSelectedTaskIds(new Set()); // Reset selection
    await syncProjectToSupabase(updatedProject);
    showToast("그룹 폴더가 생성되었습니다. (Ctrl+G)");
  };

  handleGroupTasksRef.current = handleGroupTasks;

  const handleUngroupTasks = async () => {
    if (!currentProject || selectedTaskIds.size === 0) return;

    const nextMeta = { ...(currentProject.task_states?.meta || {}) };
    const nextGroups = { ...(nextMeta.task_groups || {}) };
    let changed = false;

    Object.keys(nextGroups).forEach(stepId => {
      const sId = parseInt(stepId);
      nextGroups[sId] = nextGroups[sId].filter((group: any) => {
        // If any selected task is in this group, disband it
        const hasMatch = (group.taskIds || []).some((id: string) => selectedTaskIds.has(id));
        if (hasMatch) changed = true;
        return !hasMatch;
      });
    });

    if (changed) {
      nextMeta.task_groups = nextGroups;
      const updatedProject = {
        ...currentProject,
        task_states: { ...currentProject.task_states, meta: nextMeta }
      };
      setCurrentProject(updatedProject);
      setSelectedTaskIds(new Set());
      await syncProjectToSupabase(updatedProject);
      showToast("그룹이 해제되었습니다.");
    }
  };

  handleUngroupTasksRef.current = handleUngroupTasks;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        if (e.shiftKey) {
          handleUngroupTasksRef.current();
        } else {
          handleGroupTasksRef.current();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleTaskToggleSelect = (taskId: string, multi: boolean = false) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        if (!multi) next.delete(taskId);
      } else {
        if (!multi) next.clear();
        next.add(taskId);
      }
      return next;
    });
  };

  const handleTaskBulkSelect = (taskIds: string[]) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      taskIds.forEach(id => {
        next.add(id);
      });
      return next;
    });
  };

  const handleReorderTasks = async (
    stepId: number,
    fromIdx: number,
    toIdx: number,
  ) => {
    if (!currentProject || currentProject.is_locked) return;
    
    // 1. Get all tasks in current order
    const allVisibleTasks = getVisibleTasks(stepId, currentProject, rounds) as Task[];
    const result = Array.from(allVisibleTasks);
    
    // 2. Identify logical blocks (folders or round pairs)
    const nextMeta = currentProject.task_states?.meta || {};
    const taskGroups = nextMeta.task_groups?.[stepId] || [];
    
    const logicalItems: (Task | Task[])[] = [];
    let i = 0;
    while (i < result.length) {
      const task = result[i];
      
      // A. Check if it's a folder/group
      const group = taskGroups.find((g: any) => (g.taskIds || []).includes(task.id));
      if (group) {
        const groupTasks = result.filter(t => (group.taskIds || []).includes(t.id));
        // Identify if this task is the start of this group in the current result array
        if (groupTasks.length > 0 && groupTasks[0].id === task.id) {
          logicalItems.push(groupTasks);
          i += groupTasks.length;
          continue;
        }
      }
      
      // B. Check if it's a round pair (Step 2 or 3)
      if (stepId === 2 || stepId === 3) {
        const isRoundStart = task.id.match(/t[23]-round-\d+-(pm|prop)/);
        if (isRoundStart) {
          const next = result[i + 1];
          const partnerSuffix = task.id.includes("-pm") ? "-des" : "-feed";
          const currentSuffix = task.id.includes("-pm") ? "-pm" : "-prop";
          if (next && next.id === task.id.replace(currentSuffix, partnerSuffix)) {
            logicalItems.push([task, next]);
            i += 2;
            continue;
          }
        }
      }
      
      // C. Plain task
      logicalItems.push(task);
      i++;
    }

    // 3. Find logical indices for from/to
    const findLogicalIdx = (taskIdx: number) => {
      let currentIdx = 0;
      for (let j = 0; j < logicalItems.length; j++) {
        const item = logicalItems[j];
        const len = Array.isArray(item) ? item.length : 1;
        if (taskIdx >= currentIdx && taskIdx < currentIdx + len) return j;
        currentIdx += len;
      }
      return logicalItems.length; // Target is past the last item (drop at bottom)
    };

    const fromLogicalIdx = findLogicalIdx(fromIdx);
    const toLogicalIdx = findLogicalIdx(toIdx);

    if (fromLogicalIdx >= logicalItems.length) return;

    // 4. Perform the move
    const [removed] = logicalItems.splice(fromLogicalIdx, 1);
    // If moving down, the removal shifts items up, but we want to drop at the target's logical position in the NEW list
    // Splice handles this naturally
    logicalItems.splice(toLogicalIdx, 0, removed);
    
    // 5. Update task_order
    const flattened = logicalItems.flat();
    const nextTaskOrder = { ...(currentProject.task_order || {}) };
    nextTaskOrder[stepId] = flattened.map((t) => t.id);
    
    const updatedProject = {
      ...currentProject,
      task_order: nextTaskOrder,
      last_updated: new Date().toISOString(),
    };
    
    // 6. Persist
    setCurrentProject(updatedProject);
    const nextProjects = projects.map((p) =>
      p.id === currentProject.id ? updatedProject : p,
    );
    setProjects(nextProjects);
    localStorage.setItem("grafy_projects", JSON.stringify(nextProjects));
    await syncProjectToSupabase(updatedProject);
  };

  const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
    if (!currentProject || currentProject.is_locked) return;

    let targetTask = findTaskInProject(taskId);
    if (!targetTask) return;

    // 1. Prepare new task object
    const updatedTask = { ...targetTask, ...updates };

    // 2. Determine Step ID
    let stepId = 0;

    // Check custom tasks first to find step affiliation
    const currentCustoms = currentProject.custom_tasks || {};
    for (const sId in currentCustoms) {
      if (currentCustoms[sId].some((t) => t.id === taskId)) {
        stepId = parseInt(sId);
        break;
      }
    }

    // If not found in custom, check static
    if (stepId === 0) {
      for (const step of STEPS_STATIC) {
        if (step.tasks.some((t) => t.id === taskId)) {
          stepId = step.id;
          break;
        }
      }
    }

    // Fallback for dynamic tasks (t2-..., t3-..., t4-...)
    if (stepId === 0) {
      if (taskId.startsWith("t")) stepId = parseInt(taskId[1]);
      else if (taskId.startsWith("custom"))
        stepId = parseInt(taskId.split("-")[1]);
    }

    if (stepId === 0) {
      return;
    }

    // 3. Update Custom Tasks
    const nextCustomTasks = { ...currentCustoms };
    const stepTasks = nextCustomTasks[stepId] || [];

    const existingIndex = stepTasks.findIndex((t) => t.id === taskId);

    if (existingIndex > -1) {
      // Already custom task -> update
      stepTasks[existingIndex] = updatedTask;
      nextCustomTasks[stepId] = stepTasks;
    } else {
      // Static task -> promote to custom
      nextCustomTasks[stepId] = [...stepTasks, updatedTask];
    }

    // 4. Save
    const updatedProject = {
      ...currentProject,
      custom_tasks: nextCustomTasks,
      last_updated: new Date().toISOString(),
    };

    // Optimistic Update
    setCurrentProject(updatedProject);
    const nextProjects = projects.map((p) =>
      p.id === updatedProject.id ? updatedProject : p,
    );
    setProjects(nextProjects);
    localStorage.setItem("grafy_projects", JSON.stringify(nextProjects));

    syncProjectToSupabase(updatedProject);
  };

  const handleSaveTaskInfo = (
    taskId: string,
    roles: Role[],
    title: string,
    description: string,
    completed_date: string,
  ) => {
    if (!currentProject || currentProject.is_locked) return;
    const nextCustomTasks = { ...(currentProject.custom_tasks || {}) };
    let found = false;
    for (const stepId in nextCustomTasks) {
      const idx = nextCustomTasks[stepId].findIndex((t) => t.id === taskId);
      if (idx > -1) {
        nextCustomTasks[stepId][idx] = {
          ...nextCustomTasks[stepId][idx],
          roles,
          title,
          description,
          completed_date,
        };
        found = true;
        break;
      }
    }
    if (!found) {
      for (const step of STEPS_STATIC) {
        const sTask = step.tasks.find((t) => t.id === taskId);
        if (sTask) {
          const sid = step.id;
          if (!nextCustomTasks[sid]) nextCustomTasks[sid] = [];
          nextCustomTasks[sid].push({
            ...sTask,
            roles,
            title,
            description,
            completed_date,
          });
          found = true;
          break;
        }
      }
    }
    if (
      !found &&
      (taskId.startsWith("t3-round-") ||
        taskId.startsWith("t4-round-") ||
        taskId.startsWith("t2-round-"))
    ) {
      const isNav = taskId.startsWith("t2");
      const sid = isNav ? 2 : taskId.startsWith("t3") ? 3 : 4;

      if (!nextCustomTasks[sid]) nextCustomTasks[sid] = [];

      let defaultTitle = "";
      let defaultRoles: Role[] = [];

      if (isNav) {
        const isProp = taskId.endsWith("-prop");
        const roundNum = taskId.split("-")[2];
        defaultTitle = isProp
          ? `${roundNum}차 제안_버벌 아이덴티티 / 브랜드네임, 슬로건 등 도출_Ver${roundNum}.0`
          : `${roundNum}차 제안에 대한 피드백`;
        defaultRoles = isProp
          ? [Role.PM, Role.DESIGNER]
          : [Role.CLIENT, Role.PM];
      } else {
        const isPm = taskId.endsWith("-pm");
        const roundNum = taskId.split("-")[2];
        defaultTitle = isPm
          ? `${roundNum}차 피드백 수급`
          : `${roundNum}차 수정 및 업데이트`;
        defaultRoles = isPm ? [Role.PM] : [Role.DESIGNER];
      }

      nextCustomTasks[sid].push({
        id: taskId,
        roles: roles && roles.length > 0 ? roles : defaultRoles,
        title: title || defaultTitle,
        description: description || "",
        completed_date: completed_date || "00-00-00",
      });
      found = true;
    }
    if (found) {
      const updatedProject = {
        ...currentProject,
        custom_tasks: nextCustomTasks,
        last_updated: new Date().toISOString(),
      };

      // Explicitly update local state first
      setCurrentProject(updatedProject);
      const nextProjects = projects.map((p) =>
        p.id === currentProject.id ? updatedProject : p,
      );
      setProjects(nextProjects);
      localStorage.setItem("grafy_projects", JSON.stringify(nextProjects));

      updateProjectProgress(completedTasks, updatedProject);
      // syncProjectToSupabase is called inside updateProjectProgress
      showToast("태스크 정보 저장 완료");
    }
    setTaskEditPopover((prev) => ({ ...prev, isOpen: false }));
  };

  const handleUpdateRounds2 = async (newCount: number) => {
    if (!currentProject || currentProject.is_locked) return;
    setRounds2(newCount);
    const updatedProject = {
      ...currentProject,
      rounds2_count: newCount,
      last_updated: new Date().toISOString(),
    };

    setCurrentProject(updatedProject);
    const nextProjects = projects.map((p) =>
      p.id === currentProject.id ? updatedProject : p,
    );
    setProjects(nextProjects);
    localStorage.setItem("grafy_projects", JSON.stringify(nextProjects));

    await updateProjectProgress(completedTasks, updatedProject);
    showToast(`Expedition 2 라운드가 ${newCount}개로 설정되었습니다.`);
  };

  const handleUpdateRoundsNavigation = async (newCount: number) => {
    if (!currentProject || currentProject.is_locked) return;

    // 최소 2개로 제한 (Step 3, 4와 동일)
    if (newCount < 2) {
      showToast("Navigation은 최소 2개를 유지해야 합니다.");
      return;
    }

    setRoundsNavigation(newCount);
    const updatedProject = {
      ...currentProject,
      rounds_navigation_count: newCount,
      last_updated: new Date().toISOString(),
    };

    setCurrentProject(updatedProject);
    const nextProjects = projects.map((p) =>
      p.id === currentProject.id ? updatedProject : p,
    );
    setProjects(nextProjects);
    localStorage.setItem("grafy_projects", JSON.stringify(nextProjects));

    await updateProjectProgress(completedTasks, updatedProject);
    showToast(`Navigation 라운드가 ${newCount}개로 설정되었습니다.`);
  };

  const handleToggleExpedition2 = async (hide: boolean) => {
    if (!currentProject || currentProject.is_locked) return;

    // Optimistic Update
    const updatedMeta = {
      ...(currentProject.task_states?.meta || {}),
      is_expedition2_hidden: hide,
    };

    // 라운드 카운트 정보 유실 방지
    if (!updatedMeta.rounds_count) updatedMeta.rounds_count = rounds;
    if (!updatedMeta.rounds2_count) updatedMeta.rounds2_count = rounds2;
    if (!updatedMeta.rounds_navigation_count)
      updatedMeta.rounds_navigation_count = roundsNavigation;
    // Ensure complex objects are preserved
    if (!updatedMeta.custom_tasks)
      updatedMeta.custom_tasks = currentProject.custom_tasks;
    if (!updatedMeta.task_order)
      updatedMeta.task_order = currentProject.task_order;
    if (!updatedMeta.deleted_tasks)
      updatedMeta.deleted_tasks = currentProject.deleted_tasks;

    const updatedProject = {
      ...currentProject,
      task_states: {
        ...currentProject.task_states,
        completed: currentProject.task_states?.completed || [],
        links: currentProject.task_states?.links || {},
        meta: updatedMeta,
      },
      last_updated: new Date().toISOString(),
    };

    setCurrentProject(updatedProject);
    const nextProjects = projects.map((p) =>
      p.id === currentProject.id ? updatedProject : p,
    );
    setProjects(nextProjects);
    localStorage.setItem("grafy_projects", JSON.stringify(nextProjects));

    // DB Update
    if (isSupabaseReady && supabase) {
      await supabase
        .from("projects")
        .update({
          task_states: updatedProject.task_states,
          last_updated: updatedProject.last_updated,
        })
        .eq("id", updatedProject.id);
    }

    if (hide) {
      showToast("Expedition 2 섹션이 숨겨졌습니다.");
      setConfirmHideExpedition2(false);
    } else {
      showToast("Expedition 2 섹션이 복원되었습니다.");
    }
  };



  const handleCreateProject = async (
    name: string,
    pm: TeamMember | null,
    designers: (TeamMember | null)[],
    startDate: string,
    customTasksTemplate?: any,
    templateName?: string,
    taskOrderTemplate?: any,
    templateProject?: Project | null,
  ) => {
    try {
      const [dLead, d1, d2] = designers;

      const withTimeout = async <T,>(promise: PromiseLike<T>, ms: number) => {
        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        const timeoutPromise = new Promise((resolve) => {
          timeoutId = setTimeout(() => resolve({ timeout: true }), ms);
        });
        const result = await Promise.race([
          Promise.resolve(promise),
          timeoutPromise,
        ]);
        if (timeoutId) clearTimeout(timeoutId);
        return result;
      };

      // Prepare complex objects first to avoid self-reference issues
      const finalCustomTasks = customTasksTemplate
        ? JSON.parse(JSON.stringify(customTasksTemplate))
        : JSON.parse(JSON.stringify(DEFAULT_CUSTOM_TASKS));
      const finalTaskOrder = taskOrderTemplate
        ? JSON.parse(JSON.stringify(taskOrderTemplate))
        : {};
      const finalDeletedTasks: string[] = [];

      // Reset all task dates to 00-00-00 for new projects
      for (let stepId = 1; stepId <= 5; stepId++) {
        if (finalCustomTasks[stepId]) {
          finalCustomTasks[stepId] = finalCustomTasks[stepId].map(
            (task: Task) => ({
              ...task,
              completed_date: "00-00-00",
            }),
          );
        }
      }

      const newProject: Project = {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        name,
        pm_name: pm ? `${pm.name} ${pm.title}` : "",
        pm_phone: pm?.phone,
        pm_email: pm?.email,
        designer_name: dLead ? `${dLead.name} ${dLead.title}` : "",
        designer_phone: dLead?.phone,
        designer_email: dLead?.email,
        designer_2_name: d1 ? `${d1.name} ${d1.title}` : "",
        designer_2_phone: d1?.phone,
        designer_2_email: d1?.email,
        designer_3_name: d2 ? `${d2.name} ${d2.title}` : "",
        designer_3_phone: d2?.phone,
        designer_3_email: d2?.email,
        status: 0,
        last_updated: new Date().toISOString(),
        rounds_count: templateProject?.rounds_count ?? 2,
        rounds2_count: templateProject?.rounds2_count ?? 2,
        rounds_navigation_count: templateProject?.rounds_navigation_count ?? 2,
        start_date: startDate,
        end_date: "",
        is_locked: false,
        deleted_tasks: templateProject?.deleted_tasks
          ? [...templateProject.deleted_tasks]
          : finalDeletedTasks,
        custom_tasks: finalCustomTasks,
        task_order: finalTaskOrder,
        task_states: {
          completed: [],
          links: {},
          meta: {
            rounds_count: templateProject?.rounds_count ?? 2,
            rounds2_count: templateProject?.rounds2_count ?? 2,
            rounds_navigation_count:
              templateProject?.rounds_navigation_count ?? 2,
            client_visible_tasks: [],
            template_name: templateName,
            custom_tasks: finalCustomTasks,
            task_order: finalTaskOrder,
            deleted_tasks: templateProject?.deleted_tasks
              ? [...templateProject.deleted_tasks]
              : finalDeletedTasks,
            is_expedition2_hidden:
              templateProject?.task_states?.meta?.is_expedition2_hidden,
            step_titles: templateProject?.task_states?.meta?.step_titles,
          },
        },
        client_visible_tasks: [],
        template_name: templateName,
      };

      // Optimistic UI Update
      const updatedProjects = [newProject, ...projects];
      setProjects(updatedProjects);
      localStorage.setItem("grafy_projects", JSON.stringify(updatedProjects));

      // NAS 폴더 생성 API 호출
      console.log("🛠 [NAS] 단계 1: NAS 생성 로직 진입");
      try {
        if (startDate) {
          console.log("🛠 [NAS] 단계 2: 파라미터 준비 완료", { name, startDate, pm, designers });
          const designerNames = [
            dLead ? `${dLead.name} ${dLead.title}` : undefined,
            d1 ? `${d1.name} ${d1.title}` : undefined,
            d2 ? `${d2.name} ${d2.title}` : undefined,
          ].filter(Boolean) as string[];

          console.log("🛠 [NAS] 단계 3: API 요청 전송 시작");
          const nasResult = await createProjectFolder({
            name,
            startDate,
            pmName: pm ? `${pm.name} ${pm.title}` : undefined,
            designerNames,
          });
          console.log("🛠 [NAS] 단계 4: API 응답 수신", nasResult);

          if (nasResult && nasResult.success) {
            console.log("🛠 [NAS] 단계 5: 성공 처리");
            newProject.nas_folder_path = nasResult.folderPath;
            newProject.nas_folder_created = true;
            newProject.nas_last_synced = newProject.last_updated;
            showToast("✅ NAS 폴더 생성 완료");
          } else {
            console.log("🛠 [NAS] 단계 5: 서버는 응답했으나 실패 처리", nasResult);
            showToast(`⚠️ NAS 응답 오류: ${nasResult?.error || "생성 실패"}`);
          }
        } else {
          console.log("🛠 [NAS] 단계 2 실패: startDate가 없음");
        }
      } catch (nasError: any) {
        console.error("❌ [NAS] 단계 3/4 에러 발생:", nasError);
        showToast(`⚠️ NAS 통신 실패: ${nasError.message || "서버 응답 없음"}`);
      }
      console.log("🛠 [NAS] 단계 6: NAS 로직 종료 및 Supabase 동기화 진행");

      // Sync to Supabase
      try {
        if (isSupabaseReady && supabase) {
          // Ensure all JSON fields are objects/arrays, not undefined
          // AND Remove non-existent columns (rounds, client_visible_tasks)
          const {
            rounds_count,
            rounds2_count,
            rounds_navigation_count,
            client_visible_tasks,
            template_name,
            ...baseProject
          } = newProject;

          const projectToSave = {
            ...baseProject,
            custom_tasks: newProject.custom_tasks || {},
            task_order: newProject.task_order || {},
            task_states: newProject.task_states || {
              completed: [],
              links: {},
              meta: {
                rounds_count,
                rounds2_count,
                rounds_navigation_count,
                client_visible_tasks,
                custom_tasks: newProject.custom_tasks,
                task_order: newProject.task_order,
                deleted_tasks: newProject.deleted_tasks,
                step_titles: templateProject?.task_states?.meta?.step_titles,
              },
            }, // Ensure meta is populated
            deleted_tasks: newProject.deleted_tasks || [],
            nas_folder_path: newProject.nas_folder_path || null,
            nas_folder_created: newProject.nas_folder_created || false,
            nas_last_synced: newProject.nas_last_synced || null,
          };

          const insertResult = await withTimeout(
            supabase.from("projects").insert(projectToSave),
            8000,
          );
          if ((insertResult as any)?.timeout) {
            showToast("⚠️ Supabase 저장 지연: 로컬에만 저장되었습니다.");
          }
        }
      } catch (e) {
        showToast("프로젝트 저장 중 오류가 발생했으나 로컬에는 저장되었습니다.");
      }

      selectProject(newProject);
      showToast("프로젝트가 생성되었습니다.");
    } catch (error: any) {
      console.error("❌ 프로젝트 생성 중 오류:", error);
      showToast("프로젝트 생성 중 오류가 발생했습니다.");
    } finally {
      setShowCreateModal(false);
    }
  };

  const handleSaveTemplate = async (templateName: string) => {
    if (!currentProject) return;
    if (!isSupabaseReady || !supabase) {
      showToast("데이터베이스 연결 오류");
      return;
    }

    try {
      const {
        id,
        created_at,
        rounds_count,
        rounds2_count,
        rounds_navigation_count,
        client_visible_tasks,
        deleted_at, // Omit
        template_name,
        ...projectData
      } = currentProject;

      // Use current state for rounds to ensure accuracy
      const templateFullData = {
        ...projectData,
        id: crypto.randomUUID(),
        name: templateName,
        pm_name: "TEMPLATE",
        status: -1,
        is_locked: true,
        last_updated: new Date().toISOString(),
        task_states: {
          ...(currentProject.task_states || {}),
          meta: {
            rounds_count: rounds,
            rounds2_count: rounds2,
            rounds_navigation_count: roundsNavigation, // Ensure this is captured
            client_visible_tasks: currentProject.client_visible_tasks,
            is_expedition2_hidden:
              currentProject.task_states?.meta?.is_expedition2_hidden,
            template_name: templateName,
            custom_tasks: currentProject.custom_tasks,
            task_order: currentProject.task_order,
            deleted_tasks: currentProject.deleted_tasks,
            step_titles: currentProject.task_states?.meta?.step_titles,
          },
        },
      };

      // Explicitly cast to any to bypass strict checks if Supabase types are partial
      const { error } = await supabase
        .from("projects")
        .insert(templateFullData as any);

      if (error) {
        throw new Error(error.message || "Unknown Supabase error");
      }

      showToast("템플릿이 저장되었습니다.");
      fetchProjects(true); // Refresh templates silently
    } catch (e: any) {
      showToast(`템플릿 저장 실패: ${e.message}`);
    }
  };

  const handleUpdateProject = async (
    projectId: string,
    updates: Partial<Project>,
  ) => {
    if (!isSupabaseReady || !supabase) {
      showToast("데이터베이스 연결 오류");
      return;
    }

    try {
      // Check if it's a template or project
      const isTemplate = templates.some((t) => t.id === projectId);

      if (isTemplate) {
        const updatedTemplates = templates.map((t) =>
          t.id === projectId
            ? { ...t, ...updates, last_updated: new Date().toISOString() }
            : t,
        );
        setTemplates(updatedTemplates);
        // Templates usually not in local 'grafy_projects' if status is -1, but we update Supabase securely
      } else {
        // Update local state for projects
        const updatedProjects = projects.map((p) =>
          p.id === projectId
            ? { ...p, ...updates, last_updated: new Date().toISOString() }
            : p,
        );
        setProjects(updatedProjects);
        localStorage.setItem("grafy_projects", JSON.stringify(updatedProjects));
      }

      // Update in Supabase
      const { error } = await supabase
        .from("projects")
        .update({ ...updates, last_updated: new Date().toISOString() })
        .eq("id", projectId);

      if (error) throw error;

      showToast(
        isTemplate
          ? "템플릿이 업데이트되었습니다."
          : "프로젝트가 업데이트되었습니다.",
      );
    } catch (e: any) {
      showToast(`업데이트 실패: ${e.message}`);
    }
  };

  const handleSaveUrl = async (taskId: string, url: string, label: string) => {
    if (!currentProject || currentProject.is_locked) return;
    const nextLinks = new Map<string, { url: string; label: string }>(
      taskLinks,
    );
    nextLinks.set(taskId, { url, label });
    setTaskLinks(nextLinks);

    // Update task_states.links
    const nextTaskStates = {
      ...currentProject.task_states,
      links: {
        ...(currentProject.task_states?.links || {}),
        [taskId]: { url, label },
      },
    };

    const updatedProject = {
      ...currentProject,
      task_states: nextTaskStates as any, // Type assertion for safety
      last_updated: new Date().toISOString(),
    };

    updateProjectProgress(completedTasks, updatedProject, nextLinks);
    // Explicitly sync
    setCurrentProject(updatedProject);
    const nextProjects = projects.map((p) =>
      p.id === currentProject.id ? updatedProject : p,
    );
    setProjects(nextProjects);
    localStorage.setItem("grafy_projects", JSON.stringify(nextProjects));
    await syncProjectToSupabase(updatedProject);
    showToast("링크가 저장되었습니다.");
  };

  /* Snapshot Logic */
  const handleSnapshotToggle = () => {
    if (!currentProject || currentProject.is_locked) return;
    if (!isSnapshotMode) {
      setSnapshotSelectedTasks(
        new Set(currentProject.client_visible_tasks || []),
      );
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
    const updated = {
      ...currentProject,
      client_visible_tasks: visibleList,
      last_updated: new Date().toISOString(),
    };
    setCurrentProject(updated);
    saveProjectsLocal(
      projects.map((p) => (p.id === currentProject.id ? updated : p)),
    );
    if (isSupabaseReady && supabase) {
      await supabase
        .from("projects")
        .update({
          client_visible_tasks: visibleList,
          last_updated: updated.last_updated,
        })
        .eq("id", updated.id);
    }
    setIsSnapshotMode(false);
    setSnapshotSelectedTasks(new Set());
    showToast("클라이언트 뷰 설정이 저장되었습니다.");
  };

  const handleUpdateStepTitle = async (stepId: number, newTitle: string) => {
    if (!currentProject) return;

    // Deep clone metadata and update step_titles
    const updatedMeta = currentProject.task_states?.meta
      ? { ...currentProject.task_states.meta }
      : {};
    updatedMeta.step_titles = {
      ...updatedMeta.step_titles,
      [stepId]: newTitle,
    };

    const updatedTaskStates = {
      ...currentProject.task_states,
      meta: updatedMeta,
    };

    const updatedProject = {
      ...currentProject,
      task_states: updatedTaskStates,
      last_updated: new Date().toISOString(),
    };

    setCurrentProject(updatedProject);
    saveProjectsLocal(
      projects.map((p) => (p.id === updatedProject.id ? updatedProject : p)),
    );

    if (isSupabaseReady && supabase) {
      await supabase
        .from("projects")
        .update({
          task_states: updatedTaskStates,
          last_updated: updatedProject.last_updated,
        })
        .eq("id", updatedProject.id);
    }
  };

  const handleExportAllProjects = async () => {
    if (projects.length === 0) {
      showToast("내보낼 프로젝트가 없습니다.");
      return;
    }

    import("xlsx")
      .then((XLSX) => {
        const data = projects.map((p) => ({
          프로젝트명: p.name,
          시작일: p.start_date || "-",
          종료일: p.end_date || "-",
          진행률: `${p.status}%`,
          PM: p.pm_name || "-",
          "PM 연락처": p.pm_phone || "-",
          "PM 이메일": p.pm_email || "-",
          디자이너: p.designer_name || "-",
          "최종 업데이트": p.last_updated
            ? new Date(p.last_updated).toLocaleString("ko-KR")
            : "-",
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, "프로젝트 목록");

        const filename = `프로젝트_목록_${new Date().toISOString().slice(0, 10)}.xlsx`;
        XLSX.writeFile(wb, filename);
        showToast("전체 프로젝트 목록이 다운로드되었습니다.");
      })
      .catch((error) => {
        console.error("Error exporting projects:", error);
        showToast("다운로드 중 오류가 발생했습니다.");
      });
  };

  const handleExportToExcel = async () => {
    if (!currentProject) {
      showToast("내보낼 프로젝트를 선택해주세요.");
      return;
    }

    import("xlsx")
      .then((XLSX) => {
        // Prepare project header information
        const headerData = [
          { 필드: "프로젝트명", 값: currentProject.name },
          { 필드: "시작일", 값: currentProject.start_date || "-" },
          { 필드: "종료일", 값: currentProject.end_date || "-" },
          { 필드: "진행률", 값: `${currentProject.status}%` },
          { 필드: "PM", 값: currentProject.pm_name || "-" },
          { 필드: "PM 전화", 값: currentProject.pm_phone || "-" },
          { 필드: "PM 이메일", 값: currentProject.pm_email || "-" },
          { 필드: "디자이너 A", 값: currentProject.designer_name || "-" },
          { 필드: "디자이너 A 전화", 값: currentProject.designer_phone || "-" },
          {
            필드: "디자이너 A 이메일",
            값: currentProject.designer_email || "-",
          },
          { 필드: "디자이너 B", 값: currentProject.designer_2_name || "-" },
          {
            필드: "디자이너 B 전화",
            값: currentProject.designer_2_phone || "-",
          },
          {
            필드: "디자이너 B 이메일",
            값: currentProject.designer_2_email || "-",
          },
          { 필드: "디자이너 C", 값: currentProject.designer_3_name || "-" },
          {
            필드: "디자이너 C 전화",
            값: currentProject.designer_3_phone || "-",
          },
          {
            필드: "디자이너 C 이메일",
            값: currentProject.designer_3_email || "-",
          },
          {
            필드: "최종 업데이트",
            값: currentProject.last_updated
              ? new Date(currentProject.last_updated).toLocaleString("ko-KR")
              : "-",
          },
        ];

        // Get all tasks across all steps
        const tasksData: any[] = [];

        STEPS_STATIC.forEach((step, stepIdx) => {
          // Skip Step 4 (Expedition 2) if hidden
          if (
            step.id === 4 &&
            currentProject.task_states?.meta?.is_expedition2_hidden
          ) {
            return;
          }

          const visibleTasks = getVisibleTasks(step.id, currentProject, rounds);

          // Get step title from metadata or use default
          const stepTitle =
            currentProject.task_states?.meta?.step_titles?.[step.id] ||
            step.title;

          // Reorder tasks to match UI representation (Preserving relative order of groups and single tasks)
          const currentStepGroups = currentProject.task_states?.meta?.task_groups?.[step.id] || [];
          const orderedTasks: Task[] = [];
          const processedTaskIds = new Set<string>();

          let i = 0;
          while (i < visibleTasks.length) {
            const task = visibleTasks[i];
            const taskGroup = currentStepGroups.find((g: any) => (g.taskIds || []).includes(task.id));

            if (taskGroup) {
              const groupTasks = visibleTasks.filter((t) => (taskGroup.taskIds || []).includes(t.id));
              const isFirstVisibleInGroup = groupTasks[0]?.id === task.id;

              if (isFirstVisibleInGroup) {
                groupTasks.forEach(t => {
                  orderedTasks.push(t);
                  processedTaskIds.add(t.id);
                });
                i += groupTasks.length;
              } else {
                i++;
              }
            } else {
              if (!processedTaskIds.has(task.id)) {
                orderedTasks.push(task);
                processedTaskIds.add(task.id);
              }
              i++;
            }
          }

          orderedTasks.forEach((task, taskIdx) => {
            const taskLink = currentProject.task_states?.links?.[task.id];
            const isCompleted = completedTasks.has(task.id);
            const isClientVisible = currentProject.client_visible_tasks?.includes(task.id) || false;

            // Format todos as checklist with checkmarks
            const todosText =
              task.todos && task.todos.length > 0
                ? task.todos
                    .map((t) => `${t.isCompleted ? "☑" : "☐"} ${t.text}`)
                    .join("\n")
                : "";

            const displayStepTitle = taskIdx === 0 ? stepTitle : "=";
            const displayIndex = taskIdx === 0 ? `Step ${stepIdx + 1}` : "=";
            
            // Find current group for this task
            const taskGroup = currentStepGroups.find((g: any) => g.taskIds.includes(task.id));
            const groupName = taskGroup ? taskGroup.title : "";

            // Group name display logic: Show full group name on every row to ensure 1:1 mapping (No "=")
            const displayGroupName = groupName || "";
            // Was: if (taskIdx > 0 && groupName) ... check prev ... set "="

            tasksData.push({
              Index: displayIndex,
              스텝: displayStepTitle,
              그룹: displayGroupName,
              태스크명: task.title,
              설명: task.description || "",
              담당자:
                task.roles
                  ?.map((r) => {
                    switch (r) {
                      case Role.PM:
                        return "PM";
                      case Role.DESIGNER:
                        return "디자이너";
                      case Role.CLIENT:
                        return "클라이언트";
                      case Role.MANAGER:
                        return "매니저";
                      case Role.DEVELOPER:
                        return "개발자";
                      default:
                        return "전체";
                    }
                  })
                  .join(", ") || "-",
              완료일: task.completed_date || "00-00-00",
              완료여부: isCompleted ? "완료" : "미완료",
              링크: taskLink?.url || "",
              링크라벨: taskLink?.label || "",
              할일: todosText,
              클라이언트공개: isClientVisible ? "O" : "X",
            });
          });
        });

        // Prepare updated metadata
        const updatedMeta = {
          ...(currentProject.task_states?.meta || {}),
        };
        const updatedTaskStates = {
          ...currentProject.task_states,
          meta: updatedMeta,
        };
        const updatedProject = {
          ...currentProject,
          task_states: updatedTaskStates,
        };
        setCurrentProject(updatedProject);
        saveProjectsLocal(
          projects.map((p) => (p.id === currentProject.id ? updatedProject : p)),
        );
        if (isSupabaseReady && supabase) {
          syncProjectToSupabase(updatedProject);
        }

        // Create workbook
        const wb = XLSX.utils.book_new();

        // Add project info sheet
        const wsHeader = XLSX.utils.json_to_sheet(headerData);
        XLSX.utils.book_append_sheet(wb, wsHeader, "프로젝트 정보");

        // Add tasks sheet
        const wsTasks = XLSX.utils.json_to_sheet(tasksData);
        XLSX.utils.book_append_sheet(wb, wsTasks, "태스크 목록");

        // Generate filename
        const filename = `${currentProject.name}_프로젝트_${new Date().toISOString().slice(0, 10)}.xlsx`;

        // Download
        XLSX.writeFile(wb, filename);
        showToast("엑셀 파일이 다운로드되었습니다.");
      })
      .catch((error) => {
        console.error("Error loading xlsx:", error);
        showToast("엑셀 다운로드 중 오류가 발생했습니다.");
      });
  };

  const handleImportFromExcel = () => {
    if (!currentProject) {
      showToast("임포트할 프로젝트를 선택해주세요.");
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx,.xls";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const XLSX = await import("xlsx");
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: "array" });

        // Find info sheet
        const infoSheetName = workbook.SheetNames.find((name) =>
          name.includes("정보"),
        );
        let updatedProjectInfo = { ...currentProject };

        if (infoSheetName) {
          const infoSheet = workbook.Sheets[infoSheetName];
          const infoData = XLSX.utils.sheet_to_json<any>(infoSheet);
          infoData.forEach((row: any) => {
            const field = row["필드"];
            const value = row["값"];
            if (!field || value === undefined) return;

            switch (field) {
              case "프로젝트명":
                updatedProjectInfo.name = value;
                break;
              case "시작일":
                updatedProjectInfo.start_date = value === "-" ? "" : value;
                break;
              case "종료일":
                updatedProjectInfo.end_date = value === "-" ? "" : value;
                break;
              case "PM":
                updatedProjectInfo.pm_name = value === "-" ? "" : value;
                break;
              case "PM 전화":
                updatedProjectInfo.pm_phone = value === "-" ? "" : value;
                break;
              case "PM 이메일":
                updatedProjectInfo.pm_email = value === "-" ? "" : value;
                break;
              case "디자이너 A":
                updatedProjectInfo.designer_name = value === "-" ? "" : value;
                break;
              case "디자이너 A 전화":
                updatedProjectInfo.designer_phone = value === "-" ? "" : value;
                break;
              case "디자이너 A 이메일":
                updatedProjectInfo.designer_email = value === "-" ? "" : value;
                break;
              case "디자이너 B":
                updatedProjectInfo.designer_2_name = value === "-" ? "" : value;
                break;
              case "디자이너 B 전화":
                updatedProjectInfo.designer_2_phone =
                  value === "-" ? "" : value;
                break;
              case "디자이너 B 이메일":
                updatedProjectInfo.designer_2_email =
                  value === "-" ? "" : value;
                break;
              case "디자이너 C":
                updatedProjectInfo.designer_3_name = value === "-" ? "" : value;
                break;
              case "디자이너 C 전화":
                updatedProjectInfo.designer_3_phone =
                  value === "-" ? "" : value;
                break;
              case "디자이너 C 이메일":
                updatedProjectInfo.designer_3_email =
                  value === "-" ? "" : value;
                break;
            }
          });
        }

        // Get tasks sheet
        const tasksSheetName = workbook.SheetNames.find((name) =>
          name.includes("태스크"),
        );
        if (!tasksSheetName) {
          showToast("엑셀 파일에 '태스크 목록' 시트가 없습니다.");
          return;
        }

        const tasksSheet = workbook.Sheets[tasksSheetName];
        const tasksData = XLSX.utils.sheet_to_json<any>(tasksSheet);

        if (tasksData.length === 0) {
          showToast("태스크 데이터가 없습니다.");
          return;
        }

        // Parse Excel data and update project
        const newCompletedTasks = new Set(completedTasks);
        const newTaskLinks = new Map(taskLinks);
        const nextCustomTasks = { ...updatedProjectInfo.custom_tasks };
        const nextStepTitles = {
          ...(updatedProjectInfo.task_states?.meta?.step_titles || {}),
        };
        const nextTaskOrder: Record<number, string[]> = {};
        const nextClientVisibleTasks: string[] = [...(updatedProjectInfo.client_visible_tasks || [])];

        let currentStepId: number | null = null;
        let currentStepTitle: string | null = null;
        const nextTaskGroups: Record<number, any[]> = {}; // Will be rebuilt from Excel
        const processedSteps = new Set<number>(); // Track which steps we've cleared/initialized
        const processedRowTaskIds = new Set<string>(); // Track which tasks have been mapped to a row


        let lastGroupName: string | null = null; // Track last group name
        let currentGroup: any | null = null; // Track current group being built

        tasksData.forEach((row: any, rowIndex: number) => {
          try {
            // Identify step from Index or 스텝 title
            const indexVal = row["Index"] || "";
            const stepVal = row["스텝"] || "";
            const rawGroupName = row["그룹"];
            const groupName = rawGroupName ? String(rawGroupName).trim() : undefined;

            if (indexVal.startsWith("Step ")) {
              const stepNum = parseInt(indexVal.replace("Step ", ""));
              if (!isNaN(stepNum)) {
                currentStepId = stepNum;
                
                // ⭐ RESET LOGIC: If this is the first time parsing this step in this file,
                // wipe its order, groups, AND custom_tasks so Excel becomes the Source of Truth.
                if (!processedSteps.has(currentStepId)) {
                  nextCustomTasks[currentStepId] = [];  // ✅ FIX: Clear existing tasks for this step!
                  nextTaskOrder[currentStepId] = [];
                  nextTaskGroups[currentStepId] = [];
                  processedSteps.add(currentStepId);
                  
                  // Reset group tracking for new step
                  lastGroupName = null;
                  currentGroup = null;
                }
              }
            }

            if (!currentStepId) return;

            // Note: nextTaskOrder[currentStepId] is created above if needed


            // Update step title if explicitly changed (not "=")
            if (stepVal && stepVal !== "=") {
              currentStepTitle = stepVal;
              nextStepTitles[currentStepId] = stepVal;
            }

            // 🔥 LENIENT PARSING: Only require task name, provide safe defaults for everything else
            const titleRaw = row["태스크명"];
            if (!titleRaw || String(titleRaw).trim() === "") return; // Skip completely empty rows
            const title = String(titleRaw).trim();  // ✅ FIX: Convert to string (handles numbers like "1")

            const description = row["설명"] ? String(row["설명"]).trim() : "";
            const completedDate = row["완료일"] ? String(row["완료일"]).trim() : "00-00-00";
            const isCompleted = String(row["완료여부"] || "").trim() === "완료";
            const clientVisible = String(row["클라이언트공개"] || "").trim().toUpperCase() === "O";

            // Parse roles with safe defaults
            const rolesStr = String(row["담당자"] || "").trim();
            const roles: Role[] = rolesStr
              ? rolesStr.split(",")
                  .map((r: string) => {
                    const cleaned = r.trim();
                    if (cleaned.includes("PM")) return Role.PM;
                    if (cleaned.includes("디자이너")) return Role.DESIGNER;
                    if (cleaned.includes("클라이언트")) return Role.CLIENT;
                    if (cleaned.includes("매니저")) return Role.MANAGER;
                    if (cleaned.includes("개발자")) return Role.DEVELOPER;
                    return null;
                  })
                  .filter((r: Role | null) => r !== null)
              : []; // Default to empty array if no roles specified

            // Parse todos from 할일 field (safe default: empty array)
            const 할일Raw = String(row["할일"] || "").trim();
            const todos = 할일Raw
              ? 할일Raw.split("\n")
                  .filter((line: string) => line.trim())
                  .map((line: string) => {
                    const isComp = line.startsWith("☑");
                    const text = line.replace(/^[☑☐]\s*/, "").trim();
                    return {
                      id: crypto.randomUUID(),
                      text,
                      isCompleted: isComp,
                    };
                  })
              : []; // Default to empty todos if field is empty

            // Match task by title within current step
            if (!nextCustomTasks[currentStepId]) {
              nextCustomTasks[currentStepId] = [];
            }
            if (!nextTaskOrder[currentStepId]) {
              nextTaskOrder[currentStepId] = nextCustomTasks[currentStepId].map(t => t.id);
            }

            let taskId: string;

            // 🔥 NEW STRATEGY: Title-based matching FIRST (all steps)
            // This ensures that if title matches exactly, we update the existing task
            const exactTitleMatch = nextCustomTasks[currentStepId].find(
              (t) => t.title === title && !processedRowTaskIds.has(t.id)
            );

            if (exactTitleMatch) {
              // ✅ PRIORITY 1: Exact title match found - UPDATE IT
              taskId = exactTitleMatch.id;
              const taskIdx = nextCustomTasks[currentStepId].findIndex(t => t.id === taskId);
              nextCustomTasks[currentStepId][taskIdx] = {
                ...nextCustomTasks[currentStepId][taskIdx],
                title,  // Keep title (or update if changed, though we matched by title)
                description,
                completed_date: completedDate,
                todos,
                roles: roles.length > 0 ? roles : nextCustomTasks[currentStepId][taskIdx].roles
              };
              processedRowTaskIds.add(taskId);

              // Update completion/links
              if (isCompleted) newCompletedTasks.add(taskId);
              else newCompletedTasks.delete(taskId);
              
              const linkUrl = row["링크"] || "";
              const linkLabel = row["링크라벨"] || "";
              if (linkUrl) newTaskLinks.set(taskId, { url: linkUrl, label: linkLabel });

            } else {
              // No exact title match - try pattern matching for Step 2/3 round tasks
              let expectedDynamicId: string | null = null;
              
              if (currentStepId === 2) {
                // 🔥 More lenient pattern: just "1차", "2차"... + keywords
                const roundMatch = title.match(/^(\d+)차/);
                if (roundMatch) {
                  const roundNum = roundMatch[1];
                  if (title.includes("제안") && !title.includes("피드백")) {
                    expectedDynamicId = `t2-round-${roundNum}-prop`;
                  } else if (title.includes("피드백")) {
                    expectedDynamicId = `t2-round-${roundNum}-feed`;
                  }
                }
              } else if (currentStepId === 3) {
                const roundMatch = title.match(/^(\d+)차/);
                if (roundMatch) {
                  const roundNum = roundMatch[1];
                  if (title.includes("피드백") || title.includes("수급")) {
                    expectedDynamicId = `t3-round-${roundNum}-pm`;
                  } else if (title.includes("수정") || title.includes("업데이트")) {
                    expectedDynamicId = `t3-round-${roundNum}-des`;
                  }
                }
              }

              if (expectedDynamicId) {
                // ✅ PRIORITY 2: Pattern-based ID match for round tasks
                const existingIdx = nextCustomTasks[currentStepId].findIndex(
                  (t) => t.id === expectedDynamicId && !processedRowTaskIds.has(t.id)
                );

                if (existingIdx > -1) {
                  // Update existing round task
                  taskId = expectedDynamicId;
                  nextCustomTasks[currentStepId][existingIdx] = {
                    ...nextCustomTasks[currentStepId][existingIdx],
                    title,  // Update title (user might have changed it)
                    description,
                    completed_date: completedDate,
                    todos,
                    roles: roles.length > 0 ? roles : nextCustomTasks[currentStepId][existingIdx].roles
                  };
                } else {
                  // Create new round task with expected ID
                  taskId = expectedDynamicId;
                  const newTask: Task = {
                    id: taskId,
                    title,
                    description,
                    roles: roles.length > 0 ? roles : (currentStepId === 2 ? [Role.PM, Role.DESIGNER] : [Role.PM]),
                    completed_date: completedDate,
                    todos,
                  };
                  nextCustomTasks[currentStepId].push(newTask);
                }
                processedRowTaskIds.add(taskId);

                // Update completion/links
                if (isCompleted) newCompletedTasks.add(taskId);
                else newCompletedTasks.delete(taskId);
                
                const linkUrl = row["링크"] || "";
                const linkLabel = row["링크라벨"] || "";
                if (linkUrl) newTaskLinks.set(taskId, { url: linkUrl, label: linkLabel });

              } else {
                // ✅ PRIORITY 3: Static task matching
                const staticStep = STEPS_STATIC.find((s) => s.id === currentStepId);
                const staticTask = staticStep?.tasks?.find((t) => t.title === title);
                const isStaticAvailable = staticTask && !processedRowTaskIds.has(staticTask.id);

                if (isStaticAvailable && staticTask) {
                  // It's a template task - customize it
                  taskId = staticTask.id;
                  const newTask = {
                    ...staticTask,
                    title,  // Keep or update title
                    description,
                    completed_date: completedDate,
                    todos,
                    roles: roles.length > 0 ? roles : staticTask.roles
                  };
                  nextCustomTasks[currentStepId].push(newTask);
                  processedRowTaskIds.add(taskId);
                  
                  if (isCompleted) newCompletedTasks.add(staticTask.id);
                  else newCompletedTasks.delete(staticTask.id);
      
                  const linkUrl = row["링크"] || "";
                  const linkLabel = row["링크라벨"] || "";
                  if (linkUrl) newTaskLinks.set(staticTask.id, { url: linkUrl, label: linkLabel });
                } else {
                  // ✅ PRIORITY 4: New custom task entirely
                  taskId = `custom-${currentStepId}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                  const newTask: Task = {
                    id: taskId,
                    title,
                    description,
                    roles: roles.length > 0 ? roles : [Role.PM],
                    completed_date: completedDate,
                    todos,
                  };
                  nextCustomTasks[currentStepId].push(newTask);
                  processedRowTaskIds.add(taskId);
                  
                  if (isCompleted) newCompletedTasks.add(taskId);
                  const linkUrl = row["링크"] || "";
                  const linkLabel = row["링크라벨"] || "";
                  if (linkUrl) newTaskLinks.set(taskId, { url: linkUrl, label: linkLabel });
                }
              }
            }

            // 🔥 CRITICAL: Always add to task_order in Excel row order
            // Remove from current position if exists (shouldn't happen with new logic but safe to keep), then add to end
            const currentOrderIdx = nextTaskOrder[currentStepId].indexOf(taskId);
            if (currentOrderIdx > -1) {
              nextTaskOrder[currentStepId].splice(currentOrderIdx, 1);
            }
            nextTaskOrder[currentStepId].push(taskId);

            // 🔥 NEW GROUP LOGIC: Handle consecutive group names
            // We support "=" validly in import as "same as previous" for backward compatibility,
            // OR if the name is identical to the currently running group.
            const effectiveGroupName = groupName === "=" ? lastGroupName : groupName;

            if (effectiveGroupName) {
              // Check if this is a continuation of the previous group
              if (lastGroupName === effectiveGroupName && currentGroup) {
                // Continue adding to the current group
                if (!currentGroup.taskIds.includes(taskId)) {
                  currentGroup.taskIds.push(taskId);
                }
              } else {
                // Start a new group - allow DUPLICATE names if separated (per user request)
                currentGroup = {
                  id: `group-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                  title: effectiveGroupName,
                  taskIds: [taskId]
                };
                // Initialize array if not exists (though protected by processedSteps logic above)
                if (!nextTaskGroups[currentStepId]) nextTaskGroups[currentStepId] = [];
                
                nextTaskGroups[currentStepId].push(currentGroup);
                lastGroupName = effectiveGroupName;
              }
            } else {
              // No group - reset tracking
              lastGroupName = null;
              currentGroup = null;
            }

            // Track client visibility
            if (clientVisible) {
              if (!nextClientVisibleTasks.includes(taskId)) {
                nextClientVisibleTasks.push(taskId);
              }
            } else {
              const idx = nextClientVisibleTasks.indexOf(taskId);
              if (idx > -1) {
                nextClientVisibleTasks.splice(idx, 1);
              }
            }
          } catch (error) {
            console.error(`Excel import error at row ${rowIndex + 2}:`, error);
            // Continue processing next rows even if this one fails
          }
        });

        // 🔥 GHOST TASK FIX: Identify static tasks that were NOT in the Excel import and mark them as deleted
        // This ensures purely what is in the Excel file is shown.
        if (currentStepId && processedSteps.has(currentStepId)) {
             const staticStep = STEPS_STATIC.find((s) => s.id === currentStepId);
             if (staticStep && staticStep.tasks) {
                 staticStep.tasks.forEach(st => {
                     // If this static task ID was NOT processed (mapped to a row), delete it
                     if (!processedRowTaskIds.has(st.id)) {
                         // Add to deleted set
                         const deletedSet = new Set(updatedProjectInfo.deleted_tasks || []);
                         deletedSet.add(st.id);
                         updatedProjectInfo.deleted_tasks = Array.from(deletedSet);
                     } else {
                         // If it WAS processed, ensure it is NOT in deleted
                         if (updatedProjectInfo.deleted_tasks) {
                             updatedProjectInfo.deleted_tasks = updatedProjectInfo.deleted_tasks.filter((d: string) => d !== st.id);
                         }
                     }
                 });
             }
        }

        // Prepare final updated metadata and task states
        const finalMeta = {
          ...(updatedProjectInfo.task_states?.meta || {}),
          step_titles: nextStepTitles,
          custom_tasks: nextCustomTasks,
          task_groups: nextTaskGroups,
        };

        // Merge task_order with Excel order (EXCEL IS SOURCE OF TRUTH)
        const mergedTaskOrder = { ...(updatedProjectInfo.task_order || {}) };
        Object.keys(nextTaskOrder).forEach((stepIdStr) => {
          const stepId = parseInt(stepIdStr);
          // Overwrite with exact order from Excel for this step
          mergedTaskOrder[stepId] = nextTaskOrder[stepId];
        });

        const finalTaskStates = {
          ...updatedProjectInfo.task_states,
          completed: Array.from(newCompletedTasks),
          links: Object.fromEntries(newTaskLinks),
          meta: finalMeta,
        };

        // Calculate new progress status using the updated structure (USE REAL COMPLETED COUNT, NOT SET SIZE)
        const totalObj = calculateTotalTasks(
          updatedProjectInfo,
          newCompletedTasks as Set<string>,
          nextCustomTasks
        );
        const percent = totalObj.total === 0 ? 0 : Math.round((totalObj.completed / totalObj.total) * 100);

        const updatedProject = {
          ...updatedProjectInfo,
          task_states: finalTaskStates,
          custom_tasks: nextCustomTasks,
          task_order: mergedTaskOrder,
          client_visible_tasks: nextClientVisibleTasks,
          status: Math.min(100, percent),
          last_updated: new Date().toISOString(),
        };

        // 🔍 DEBUG: Log task_order and custom_tasks for Step 2/3
        console.log('[EXCEL IMPORT DEBUG] Import complete');
        console.log('[EXCEL IMPORT DEBUG] Step 2 task_order:', mergedTaskOrder[2]);
        console.log('[EXCEL IMPORT DEBUG] Step 3 task_order:', mergedTaskOrder[3]);
        console.log('[EXCEL IMPORT DEBUG] Step 2 custom_tasks IDs:', nextCustomTasks[2]?.map(t => t.id));
        console.log('[EXCEL IMPORT DEBUG] Step 3 custom_tasks IDs:', nextCustomTasks[3]?.map(t => t.id));

        // Apply changes
        setCurrentProject(updatedProject);
        setCompletedTasks(newCompletedTasks);
        setTaskLinks(newTaskLinks);
        
        saveProjectsLocal(
          projects.map((p) => (p.id === updatedProject.id ? updatedProject : p)),
        );

        if (isSupabaseReady && supabase) {
          try {
            await supabase
              .from("projects")
              .update({
                name: updatedProject.name,
                start_date: updatedProject.start_date,
                end_date: updatedProject.end_date,
                pm_name: updatedProject.pm_name,
                pm_phone: updatedProject.pm_phone,
                pm_email: updatedProject.pm_email,
                designer_name: updatedProject.designer_name,
                designer_phone: updatedProject.designer_phone,
                designer_email: updatedProject.designer_email,
                designer_2_name: updatedProject.designer_2_name,
                designer_2_phone: updatedProject.designer_2_phone,
                designer_2_email: updatedProject.designer_2_email,
                designer_3_name: updatedProject.designer_3_name,
                designer_3_phone: updatedProject.designer_3_phone,
                designer_3_email: updatedProject.designer_3_email,
                task_states: finalTaskStates,
                task_order: mergedTaskOrder,
                custom_tasks: nextCustomTasks,
                client_visible_tasks: nextClientVisibleTasks,
                status: updatedProject.status,
                last_updated: updatedProject.last_updated,
              })
              .eq("id", updatedProject.id);
          } catch (err) {
            console.error("Supabase sync error:", err);
          }
        }

        showToast("엑셀 데이터가 성공적으로 반영되었습니다.");
      } catch (error) {
        console.error("Error importing excel:", error);
        showToast("엑셀 임포트 중 오류가 발생했습니다.");
      }
    };

    input.click();
  };

  const status = currentProject?.status || 0;

  const isListView = currentView === 'list' && !window.location.search.includes("project=");

  return (
    <div className={`min-h-screen selection:bg-black selection:text-white ${isListView ? 'bg-[#F0EBE7]' : 'bg-[#f1f3f6]'}`}>
      {isSnapshotMode && (
        <div className="fixed top-[72px] left-0 w-full z-30 bg-black text-white px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-3 shadow-md animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <i className="fa-solid fa-camera text-red-500 animate-pulse"></i>
            <span className="font-bold text-sm md:text-base">
              클라이언트에게 보여질 목록을 선택 후 결정 버튼을 눌러 주세요
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsSnapshotMode(false);
                setSnapshotSelectedTasks(new Set(currentProject?.client_visible_tasks || []));
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 transition-colors"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSaveSnapshot}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-white text-black hover:bg-slate-200 transition-colors shadow-sm"
            >
              결정 완료
            </button>
          </div>
        </div>
      )}

      {currentView === "welcome" && !isInitializing && (
        <WelcomeScreen
          onLogin={handleGoogleLogin}
          onAdminLogin={handleAdminLogin}
          isLoading={isAuthLoading}
        />
      )}
      {isInitializing && !isLoggingOut && (
        <div className="min-h-screen flex items-center justify-center bg-black">
          <div className="flex flex-col items-center gap-6">
            <i className="fa-solid fa-plane text-4xl text-white animate-airplane-pulse"></i>
            <p className="text-white font-bold">탑승 수속 중...</p>
          </div>
        </div>
      )}

      {/* Global Logout Overlay (No Hard Reload version) */}
      {isLoggingOut && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center animate-logout-backdrop">
          <style>{`
            @keyframes logoutBackdropFade {
              0% { background-color: rgba(0,0,0,0); backdrop-filter: blur(0px); }
              100% { background-color: rgba(0,0,0,0.8); backdrop-filter: blur(10px); }
            }
            @keyframes logoutTextFadeIn {
              0% { opacity: 0; transform: translateY(10px); }
              100% { opacity: 1; transform: translateY(0); }
            }
            .animate-logout-backdrop {
              animation: logoutBackdropFade 2s ease-out forwards;
            }
            .animate-logout-text-delayed {
              opacity: 0;
              animation: logoutTextFadeIn 1.5s ease-out forwards;
              animation-delay: 1.5s;
            }
          `}</style>
          <div className="text-center font-['Pretendard_Variable'] font-semibold text-white leading-relaxed space-y-1 animate-logout-text-delayed">
            <p className="text-[15pt]">함께여서 행복했습니다.</p>
            <p className="text-[15pt]">남은 여정도 행복하길 기원하겠습니다.</p>
          </div>
        </div>
      )}

      {currentView === "share" && sharedProjectId && (
        <SharedProjectView projectId={sharedProjectId} />
      )}

      {currentView === "list" &&
        !window.location.search.includes("project=") && (
          <div className="w-full h-full min-h-screen bg-[#F0EBE7] text-black pb-0 font-['Pretendard_Variable']">
             
             {/* 
                Responsive Header Section 
                Max-width 2100px as requested
              */}
                            <header className="px-8 pt-12 pb-10 max-w-[2100px] mx-auto w-full">
                <div className="grid grid-cols-1 xl:grid-cols-[60px_160px_120px_180px_150px_1fr_400px_200px] items-start gap-x-0 gap-y-12">
                  
                  {/* 1. Main Title (Spans first 5 columns on Desktop) */}
                  <div className="flex justify-start xl:col-span-5">
                     <h1 className="text-[clamp(3.5rem,7vw,6.5rem)] leading-[0.82] tracking-tight font-normal whitespace-nowrap">
                      Project(s)<br/>
                      Mgmt.<br/>
                      System
                    </h1>
                  </div>

                  {/* 2. Search Bar (Column 6 - Passenger / Project) */}
                  {/* Aligned to 'Passenger / Project' with pl-4 matching table header */}
                  <div className="flex justify-start w-full xl:col-span-1 xl:pl-4">
                    <div className="relative group w-[550px]">
                       {/* Visual Label + Icon -> Hides when searching to allow input visibility */}
                       <div className={`flex justify-between items-end border-b border-black pb-[5px] transition-opacity duration-200 ${searchTerm ? 'opacity-0' : 'opacity-100'}`}>
                         <span className="text-[27px] font-normal leading-none text-black pointer-events-none">search</span>
                         <Search className="mb-1 text-black" strokeWidth={1.5} size={22} />
                       </div>
                       
                       {/* Input Overlay */}
                       <input 
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="absolute inset-0 w-full bg-transparent outline-none text-[27px] font-normal placeholder-transparent text-black z-10 selection:bg-black selection:text-white"
                        />
                       
                       {/* Animated Line */}
                       <div className="absolute bottom-0 left-0 w-full h-[2px] bg-black scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left z-20" />
                    </div>
                  </div>

                  {/* 3. Top Menu (Column 7 - Pilots) */}
                  {/* Aligned to 'Pilots' with pl-4 matching table header */}
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-start gap-8 xl:col-span-1 xl:pl-4">
                      <div className="flex items-center gap-8">
                        <QuietButton onClick={() => setShowTeamModal(true)}>teams</QuietButton>
                        <QuietButton onClick={currentView === 'list' ? handleExportAllProjects : handleExportToExcel}>xlsx</QuietButton>
                        
                         {/* Profile Menu */}
                        <div className="relative" ref={profileMenuRef}>
                            <button 
                               type="button"
                               onClick={() => setShowProfileMenu(!showProfileMenu)} 
                               className="text-[25px] font-bold whitespace-nowrap text-black hover:opacity-60 transition-opacity"
                            >
                             {ADMIN_EMAILS.includes(user.email || '') ? 'admin.' : 'grafer.'}
                           </button>
                           {showProfileMenu && (
                              <div className="absolute left-0 top-full mt-6 bg-white/40 backdrop-blur-2xl border border-white/50 shadow-xl rounded-[30px] p-2 z-50 min-w-[200px] overflow-hidden animate-in fade-in zoom-in-55 duration-1000">
                                 {ADMIN_EMAILS.includes(user.email || '') && (
                                   <>
                                      <button 
                                          type="button"
                                          onClick={() => {
                                            setShowTemplateManagerModal(true);
                                            setShowProfileMenu(false);
                                          }}
                                          className="flex items-center gap-3 w-full text-left px-5 py-3 hover:bg-white/40 rounded-[20px] text-[15px] font-normal text-black transition-all duration-200"
                                      >
                                        <LayoutTemplate size={16} strokeWidth={2} />
                                        템플릿 관리
                                      </button>
                                       <button 
                                          type="button"
                                          onClick={() => {
                                            setShowDeletedDataModal(true);
                                            setShowProfileMenu(false);
                                          }}
                                          className="flex items-center gap-3 w-full text-left px-5 py-3 hover:bg-white/40 rounded-[20px] text-[15px] font-normal text-black transition-all duration-200"
                                      >
                                        <Trash2 size={16} strokeWidth={2} />
                                        휴지통
                                      </button>
                                      <div className="h-px bg-black/5 my-1 mx-3"/>
                                   </>
                                )}
                                 <button 
                                   type="button"
                                   onClick={() => {
                                      handleLogout();
                                      setShowProfileMenu(false);
                                   }} 
                                   className="flex items-center gap-3 w-full text-left px-5 py-3 hover:bg-white/40 rounded-[20px] text-[15px] font-normal text-black transition-all duration-200"
                                 >
                                   <LogOut size={16} strokeWidth={2} />
                                   로그아웃
                                 </button>
                              </div>
                           )}
                        </div>
                      </div>
                  </div>
                  
                  {/* 4. Logo (Column 8 - Flight time) */}
                  <div className="hidden xl:block xl:col-span-1">
                     <GrafyLogo />
                  </div>
                </div>
              </header>

              {/* Main Content Area - 2100px Max Width */}
              <main className="px-8 max-w-[2100px] mx-auto w-full mt-20">
                
                {/* Controls Bar */}
                <div className="flex flex-col sm:flex-row items-end justify-between relative mb-0 gap-4">
                   
                   {/* Filters */}
                   <div className="flex items-center translate-y-[-5px] overflow-x-auto no-scrollbar w-full sm:w-auto">
                      <div className="flex items-center">
                        <FilterTab label="최근등록순" isSelected={filter === '최근등록순'} onClick={() => setFilter('최근등록순')} isFirst />
                        <FilterTab label="프로젝트명순" isSelected={filter === '프로젝트명순'} onClick={() => setFilter('프로젝트명순')} />
                        <FilterTab label="진행율높은순" isSelected={filter === '진행율높은순'} onClick={() => setFilter('진행율높은순')} />
                        <FilterTab label="최근종료일순" isSelected={filter === '최근종료일순'} onClick={() => setFilter('최근종료일순')} />
                        <FilterTab label="카테고리순" isSelected={filter === '카테고리순'} onClick={() => setFilter('카테고리순')} isLast />
                      </div>
                   </div>

                   {/* Plus Button - Reference Style (Rotating Cross) */}
                   <div className="flex items-end h-[30px] translate-y-[-15px] flex-shrink-0">
                      <button 
                         type="button"
                         onClick={() => setShowCreateModal(true)}
                         className="group relative w-[48px] h-[48px] flex items-center justify-center cursor-pointer"
                         title="프로젝트 추가"
                      >
                         <div className="relative w-[48px] h-[48px] group-hover:rotate-90 transition-transform duration-300 ease-in-out">
                            <div className="absolute left-1/2 top-0 w-[1.5px] h-full bg-black -translate-x-1/2" />
                            <div className="absolute top-1/2 left-0 w-full h-[1.5px] bg-black -translate-y-1/2" />
                         </div>
                      </button>
                   </div>
                </div>

                {/* The Grid List */}
                <div className="w-full border-t border-black relative min-h-[300px]">
                    {isProjectLoading && (
                      <div className="absolute inset-x-0 top-[90px] flex flex-col items-center justify-center z-20">
                         <div className="flex flex-col items-center">
                            <p className="text-[12pt] text-black animate-blink-slow">프로젝트 로딩중 입니다.</p>
                         </div>
                      </div>
                    )}
                    <ProjectList
                      projects={projects
                        .filter(p => {
                           if (!searchTerm) return true;
                           const s = searchTerm.toLowerCase();
                           const pilotsStr = [p.pm_name, p.designer_name, p.designer_2_name, p.designer_3_name].filter(Boolean).join(' ').toLowerCase();
                           return (
                             p.name.toLowerCase().includes(s) ||
                             (p.start_date && p.start_date.includes(s)) ||
                             (p.end_date && p.end_date.includes(s)) ||
                             pilotsStr.includes(s)
                           );
                        })
                        .sort((a,b) => {
                           if (filter === '프로젝트명순') return a.name.localeCompare(b.name);
                           if (filter === '진행율높은순') return b.status - a.status;
                           if (filter === '최근종료일순') {
                              return new Date(b.end_date || 0).getTime() - new Date(a.end_date || 0).getTime();
                           }
                           if (filter === '카테고리순') {
                              const genreA = a.template_name || (a.name.includes('Web') ? 'Web' : a.name.includes('App') ? 'App' : a.name.includes('Video') ? 'Video' : 'Branding');
                              const genreB = b.template_name || (b.name.includes('Web') ? 'Web' : b.name.includes('App') ? 'App' : b.name.includes('Video') ? 'Video' : 'Branding');
                              return genreA.localeCompare(genreB);
                           }
                           // 최근등록순 (default)
                           return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                        })
                      }
                      onSelectProject={selectProject}
                      isAdmin={ADMIN_EMAILS.includes(user?.email || '')}
                      onDeleteProject={handleDeleteProject}
                    />
                </div>

                {/* Footer Section */}
                <footer className="mt-[30px] pb-[70px] flex justify-between items-center text-[15px] font-light text-black">
                   <span>The projects on this list are confidential. Please take security seriously.</span>
                   <span className="font-bold">ⓒ GRAFY.</span>
                </footer>
              </main>
            
            {/* Keeping Modals inside Layout */}
            {showCreateModal && (
              <CreateProjectModal
                teamMembers={teamMembers}
                templates={templates}
                onClose={() => setShowCreateModal(false)}
                onCreate={handleCreateProject}
              />
            )}

            {showTeamModal && (
              <TeamManagementModal
                members={teamMembers}
                onClose={() => setShowTeamModal(false)}
                onUpdate={handleUpdateTeamMembers}
              />
            )}
          </div>
        )}

      {currentView === "detail" && currentProject && (
        <div
          className="relative"
        >
          <Navbar
            project={currentProject}
            user={user}
            teamMembers={teamMembers}
            activeRole={activeRole}
            onRoleChange={setActiveRole}
            onSaveTemplate={() => setShowTemplateSaveModal(true)}
            onBack={() => {
              setCurrentProject(null);
              setCurrentView("list");
              window.history.pushState({}, "", "/");
            }}
            onUpdateInfo={updateProjectInfo}
            onToast={showToast}
            onToggleLock={handleToggleLock}
            onLogout={handleLogout}
            onLogin={handleGoogleLogin}
            isSnapshotMode={isSnapshotMode}
            onSnapshotToggle={handleSnapshotToggle}
            onManageDeletedData={() => setShowDeletedDataModal(true)}
            onManageTemplates={() => setShowTemplateManagerModal(true)}
            onExportToExcel={handleExportToExcel}
            onImportFromExcel={handleImportFromExcel}
          />
          <main 
            className="w-full px-4 md:px-6 py-10 max-w-[2200px] mx-auto transition-all duration-300"
            style={{ 
              filter: currentProject.is_locked ? 'grayscale(0.6)' : 'none' 
            }}
          >
            <div className="max-w-full mx-auto">
              {/* Progress Section */}
              <div className="bg-white p-6 md:p-8 rounded-[12px] md:rounded-[16px] mb-6 md:mb-10 flex flex-col md:flex-row items-center gap-6 md:gap-10 border border-slate-200 shadow-sm relative overflow-visible w-full">
                <div className="shrink-0 relative z-10 w-full md:w-auto text-center md:text-left">
                  <span className="text-[18px] md:text-[24px] font-semibold text-black leading-none tracking-tighter">
                    Project Journey
                  </span>
                </div>
                <div className="flex-1 h-3.5 md:h-4 bg-slate-100 rounded-full p-0 relative z-10 border border-slate-200 shadow-inner flex items-center overflow-visible w-full">
                  <div
                    className="bg-black h-full rounded-full transition-all duration-1000 ease-out relative flex items-center overflow-visible"
                    style={{ width: `${status}%` }}
                  >
                    {status >= 0 && (
                      <div className="absolute right-[-12px] md:right-[-15px] top-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 md:w-10 md:h-10 z-50 pointer-events-none">
                        <i className="fa-solid fa-plane text-black text-[20px] md:text-[34px] animate-airplane-pulse drop-shadow-[0_0_12px_rgba(0,0,0,0.2)]"></i>
                      </div>
                    )}
                  </div>
                </div>
                <div className="shrink-0 relative z-10 flex items-baseline">
                  <span className="text-[40px] md:text-[52px] font-bold text-black leading-none tracking-tighter">
                    {status}
                  </span>
                  <span className="text-xl md:text-2xl font-bold text-black/50 ml-1">
                    %
                  </span>
                </div>
              </div>

              {/* Steps Layout */}
              <div
                className="overflow-x-auto pb-12 no-scrollbar scroll-smooth snap-x snap-mandatory md:snap-none px-4 md:px-0"
                data-task-scroll="x"
                onWheel={(e) => {
                  const container = e.currentTarget;
                  if (container.scrollWidth <= container.clientWidth) return;
                  const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
                  if (delta === 0) return;
                  container.scrollBy({ left: delta * 4 }); // Increased from 2 to 4
                  if (e.cancelable) e.preventDefault();
                }}
              >
                <div className="flex items-start gap-4 md:gap-6 w-full container-full-steps">
                  {STEPS_STATIC.filter((step) => {
                    const isHidden =
                      currentProject?.task_states?.meta?.is_expedition2_hidden;
                    return !(step.id === 4 && isHidden);
                  }).map((step, index) => {
                    const allVisibleTasks = currentProject
                      ? getVisibleTasks(step.id, currentProject, rounds)
                      : [];
                    const locked = isLockedStep(step.id);
                    const savedTitle =
                      currentProject?.task_states?.meta?.step_titles?.[step.id];
                    const displayStep = savedTitle
                      ? { ...step, title: savedTitle }
                      : step;

                    let headerLeftButtons = null;
                    const isExpedition2Hidden =
                      currentProject?.task_states?.meta?.is_expedition2_hidden;

                    // Step 4: Hide Button
                    if (step.id === 4 && !currentProject.is_locked) {
                      headerLeftButtons = (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirmHideExpedition2) {
                              handleToggleExpedition2(true);
                            } else {
                              setConfirmHideExpedition2(true);
                              setTimeout(
                                () => setConfirmHideExpedition2(false),
                                3000,
                              );
                            }
                          }}
                          className={`w-7 h-7 md:w-8 md:h-8 rounded-full bg-white border ${confirmHideExpedition2 ? "border-red-500 text-red-500" : "border-slate-300 text-slate-300"} flex items-center justify-center hover:bg-black hover:text-white hover:border-black transition-all shadow-sm active:scale-90`}
                          title={
                            confirmHideExpedition2
                              ? "한 번 더 누르면 숨겨집니다"
                              : "Expedition 2 숨기기"
                          }
                        >
                          <i
                            className={`fa-solid ${confirmHideExpedition2 ? "fa-xmark" : "fa-minus"} text-[10px] md:text-xs`}
                          ></i>
                        </button>
                      );
                    }

                    // Step 3: Restore Button if Exp 2 Hidden
                    if (
                      step.id === 3 &&
                      isExpedition2Hidden &&
                      !currentProject.is_locked
                    ) {
                      headerLeftButtons = (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleExpedition2(false);
                          }}
                          className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-white border border-slate-300 text-blue-500 flex items-center justify-center hover:bg-black hover:text-white hover:border-black transition-all shadow-sm active:scale-90"
                          title="Expedition 2 복원"
                        >
                          <i className="fa-solid fa-arrow-right text-[10px] md:text-xs"></i>
                        </button>
                      );
                    }

                    return (
                      <StepColumn
                        key={step.id}
                        step={displayStep}
                        tasks={allVisibleTasks}
                        isLocked={locked}
                        filter={activeRole}
                        completedTasks={completedTasks}
                        taskLinks={taskLinks}
                        onToggleTask={handleToggleTask}
                        onReorder={handleReorderTasks}
                        onDeleteTask={handleDeleteTask}
                        displayIndex={index + 1}
                        headerLeftButtons={headerLeftButtons}
                        onUpdateTitle={(newTitle) =>
                          handleUpdateStepTitle(step.id, newTitle)
                        }
                        onContextMenu={(e, id, url, label) => {
                          setPopover({
                            isOpen: true,
                            taskId: id,
                            currentUrl: url || "",
                            currentLabel: label || "",
                            x: e.pageX,
                            y: e.pageY,
                          });
                          setTaskEditPopover((p) => ({ ...p, isOpen: false }));
                        }}
                        onEditContextMenu={(e, task) => {
                          if (isSnapshotMode) return;
                          setTaskEditPopover({
                            isOpen: true,
                            taskId: task.id,
                            roles: task.roles || [Role.PM],
                            title: task.title,
                            description: task.description || "",
                            completed_date: task.completed_date || "00-00-00",
                            x: e.pageX,
                            y: e.pageY,
                          });
                        }}
                        onToast={showToast}
                        isLockedProject={currentProject.is_locked}
                        projectId={currentProject.id}
                        isSnapshotMode={isSnapshotMode}
                        snapshotSelectedTasks={snapshotSelectedTasks}
                        onSnapshotTaskSelect={handleSnapshotTaskSelect}
                        onAddTask={() => handleAddCustomTask(step.id)}
                        onUpdateTask={handleUpdateTask}
                        clientVisibleTasks={
                          new Set(currentProject.client_visible_tasks || [])
                        }
                        selectedTaskIds={selectedTaskIds}
                        onTaskToggleSelect={handleTaskToggleSelect}
                        onTaskBulkSelect={handleTaskBulkSelect}
                        onClearSelection={() => setSelectedTaskIds(new Set())}
                        groups={currentProject.task_states?.meta?.task_groups?.[step.id] || []}
                        onUpdateGroupTitle={handleUpdateGroupTitle}
                      >

                      </StepColumn>
                    );
                  })}
                </div>
              </div>
            </div>
          </main>
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-[110]">
            <div className="pointer-events-auto">
              <UrlPopover
                popoverState={popover}
                onClose={() => setPopover((p) => ({ ...p, isOpen: false }))}
                onSave={handleSaveUrl}
                isAbsolute={true}
              />
              <TaskEditPopover
                state={taskEditPopover}
                onClose={() =>
                  setTaskEditPopover((p) => ({ ...p, isOpen: false }))
                }
                onSave={handleSaveTaskInfo}
                isAbsolute={true}
              />
            </div>
          </div>
        </div>
      )}
      {showTemplateSaveModal && (
        <TemplateSaveModal
          onClose={() => setShowTemplateSaveModal(false)}
          onSave={(name) => {
            handleSaveTemplate(name);
            setShowTemplateSaveModal(false);
          }}
        />
      )}
      {toastMsg && (
        <div
          className={`fixed bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 text-white px-8 md:px-12 py-4 md:py-6 rounded-full text-sm md:text-[18px] font-bold z-[9999] shadow-2xl animate-in fade-in slide-in-from-bottom-10 duration-500 flex items-center gap-3 md:gap-4 ${
            toastMsg.includes("이전 스텝") || toastMsg.includes("해제하고")
              ? "bg-red-500"
              : toastMsg.includes("저장 완료")
                ? "bg-[#05D686]"
                : "bg-black"
          }`}
        >
          {toastMsg.includes("이전 스텝") || toastMsg.includes("해제하고") ? (
            <i className="fa-solid fa-circle-xmark text-white"></i>
          ) : toastMsg.includes("저장 완료") ? (
            <i className="fa-solid fa-circle-check text-white"></i>
          ) : (
            <i className="fa-solid fa-circle-info text-white"></i>
          )}
          {toastMsg}
        </div>
      )}

      {/* Removed redundant isInitializing block to fix flickering and maintain consistency */}


      {/* Global Modals */}
      {showDeletedDataModal && (
        <DeletedDataModal
          onClose={() => setShowDeletedDataModal(false)}
          onRestore={(projectId) => {
            handleRestoreProject(projectId);
            setShowDeletedDataModal(false);
          }}
          deletedProjects={deletedProjects}
        />
      )}

      {showTemplateManagerModal && (
        <TemplateManagerModal
          templates={templates}
          onClose={() => setShowTemplateManagerModal(false)}
          onUpdate={handleUpdateProject}
          onDelete={handleDeleteProject}
        />
      )}
    </div>
  );
};

export default App;
