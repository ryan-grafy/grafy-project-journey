import React, { useState, useEffect } from "react";
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
import {
  STEPS_STATIC,
  TEAM_MEMBERS as INITIAL_TEAM_MEMBERS,
  STORAGE_BUCKET,
  DEFAULT_CUSTOM_TASKS,
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

const App: React.FC = () => {
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
  const isDataLoadedRef = React.useRef(false); // Track if initial data load is complete
  const [locationKey, setLocationKey] = useState(0); // Track URL changes manually for useEffect sync

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
  const [confirmHideExpedition2, setConfirmHideExpedition2] = useState(false); // Expedition 2 숨기기 확인 상태

  // --- SAFEGUARDS ---
  // Force Welcome if Guest is on List
  useEffect(() => {
    if (currentView === "list" && user.userId === "guest") {
      console.warn(
        "Detected Guest state on List view. Forcing Welcome screen.",
      );
      setCurrentView("welcome");
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

  // Listen for browser history changes (Back/Forward)
  useEffect(() => {
    const handlePopState = () => {
      console.log("Browser navigation detected (popstate)");
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
        console.warn("Supabase not ready.");
        if (mounted) setIsInitializing(false);
        return;
      }

      // 1. Shared Link Check
      const path = window.location.pathname;
      if (path.startsWith("/share/")) {
        const pid = path.split("/share/")[1];
        if (pid) {
          console.log("Shared link detected:", pid);
          setSharedProjectId(pid);
          setCurrentView("share");
          setIsInitializing(false);
          return;
        }
      }

      console.log("Initializing Auth...");

      // 2. Auth State Change Listener (Priority for maintaining session)
      const { data } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log("Auth Event:", event);
          if (!mounted) return;

          // FIX: Prevent view reset on token refresh
          if (event === "TOKEN_REFRESHED") return;

          if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
            if (session) {
              // Check Authorization
              const isAuthorized = await checkEmailAuthorization(
                session.user.email,
              );
              if (!isAuthorized) {
                console.warn("Unauthorized user:", session.user.email);
                await supabase.auth.signOut();
                showToast("허가되지 않은 계정입니다.");
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

              // Only switch view if not already in detail or list
              setCurrentView((prev) => (prev === "welcome" ? "list" : prev));

              // Fetch Data
              fetchTeamMembers();
              fetchProjects();

              setIsAuthLoading(false);
              setIsInitializing(false);
            }
          } else if (event === "SIGNED_OUT") {
            if (mounted) {
              console.log("User Signed Out -> Welcome");
              setCurrentView("welcome");
              setUser({
                id: "guest",
                userId: "guest",
                name: "게스트",
                avatarUrl: "",
              });
              setIsInitializing(false);
              setIsAuthLoading(false);
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
          if (mounted && isInitializing) {
            // Double check
            supabase.auth.getSession().then(({ data }) => {
              if (!data.session) {
                console.log("No session found after timeout. Showing Welcome.");
                setCurrentView("welcome");
                setIsInitializing(false);
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
        console.error("Storage init error", e);
      }
    };

    initAuth();
    initializeStorage();

    return () => {
      mounted = false;
      if (authListener) authListener.unsubscribe();
    };
  }, [isSupabaseReady]);

  // URL Search Params for Direct Project Navigation & History Handling
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const projectIdParam = params.get("project");

    // Wait until projects are loaded to perform selection
    if (!projects || projects.length === 0) return;

    if (projectIdParam) {
      const targetProject = projects.find((p) => p.id === projectIdParam);
      if (targetProject) {
        // Only trigger if the project actually changed (avoids infinite loops/redundant sets)
        if (currentProject?.id !== targetProject.id || currentView !== "detail") {
          console.log("Syncing state to URL Project:", targetProject.id);
          // Manually apply state without pushState (since we're already handling a URL change)
          setCurrentProject(targetProject);
          setRounds(targetProject.rounds_count || 2);
          setRounds2(targetProject.rounds2_count || 2);
          setRoundsNavigation(targetProject.rounds_navigation_count || 2);
          loadTasks(targetProject);
          setCurrentView("detail");
          setActiveRole(Role.ALL);
        }
      } else {
        console.warn("Project in URL not found:", projectIdParam);
        if (currentView !== "list") {
          setCurrentView("list");
          setCurrentProject(null);
        }
      }
    } else {
      // If no project param, ensure we are in the correct view
      // This handles the "Back" button from detail to list
      if (currentView === "detail") {
        console.log("No project param in URL. Switching to list view.");
        setCurrentView("list");
        setCurrentProject(null);
      }
    }
  }, [projects, locationKey]); // Depend on projects load AND manual locationKey trigger

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

  // Helper to check if email is allowed
  const checkEmailAuthorization = async (
    email: string | undefined,
  ): Promise<boolean> => {
    return true; // FIXME: TEMPORARY FIX FOR LOGIN ISSUE
    // if (!email) return false;

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
        console.error("Error parsing local team data", e);
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
        console.error("Error checking supabase authorization", e);
      }
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
        console.log(
          "Redirect URL received, window should redirect to:",
          result.data.url,
        );
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
      window.location.href = "/";
    } catch (error) {
      showToast("로그아웃 중 오류가 발생했습니다.");
      // Even if error, try to redirect
      window.location.href = "/";
    }
  };

  const fetchTeamMembers = async () => {
    try {
      if (isSupabaseReady && supabase) {
        const { data, error } = await supabase.from("team_members").select("*");
        if (!error && data && data.length > 0) {
          setTeamMembers(data);
          return;
        }
      }
      const savedTeam = localStorage.getItem("grafy_team");
      if (savedTeam) {
        setTeamMembers(JSON.parse(savedTeam));
      } else {
        const initial = INITIAL_TEAM_MEMBERS.map((m, i) => ({
          ...m,
          id: `team-${i}`,
        }));
        setTeamMembers(initial);
      }
    } catch (e) {
      console.error(e);
      const initial = INITIAL_TEAM_MEMBERS.map((m, i) => ({
        ...m,
        id: `team-${i}`,
      }));
      setTeamMembers(initial);
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

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
      remoteData.forEach((p) => mergedMap.set(p.id, p));

      localData.forEach((localP) => {
        if (localP.status === -1) return; // Skip templates
        const remoteP = mergedMap.get(localP.id);
        if (!remoteP) {
          mergedMap.set(localP.id, localP);
        } else {
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
      });

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
      
      // Mark data as loaded so subsequent fetches don't trigger spinner
      isDataLoadedRef.current = true;
    } catch (e) {
      console.error(e);
    }
    setIsProjectLoading(false);
  };

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
        console.error("Supabase sync error:", e);
      }
    }
  };

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
        console.error("Supabase upsert error:", error);
      } else {
        console.log(
          "[Sync] Project synced to Supabase:",
          project.id,
          "Updated:",
          project.last_updated,
        );
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

    let end_date = currentProject.end_date;
    if (locked) {
      const now = new Date();
      const yy = String(now.getFullYear()).slice(-2);
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      end_date = `${yy}-${mm}-${dd}`;
    }

    const updated = {
      ...currentProject,
      is_locked: locked,
      end_date,
      last_updated: new Date().toISOString(),
    };
    setCurrentProject(updated);

    const nextProjects = projects.map((p) =>
      p.id === currentProject.id ? updated : p,
    );
    setProjects(nextProjects);
    localStorage.setItem("grafy_projects", JSON.stringify(nextProjects));

    await syncProjectToSupabase(updated);
    showToast(
      locked
        ? "프로젝트가 잠겼습니다. 종료일이 기록되었습니다."
        : "프로젝트 잠금이 해제되었습니다.",
    );
  };

  const selectProject = (project: Project) => {
    // Update URL to support persistence and sharing
    const newUrl = `${window.location.pathname}?project=${project.id}`;
    window.history.pushState({ projectId: project.id }, "", newUrl);

    setCurrentProject(project);
    setRounds(project.rounds_count || 2);
    setRounds2(project.rounds2_count || 2);
    setRoundsNavigation(project.rounds_navigation_count || 2);
    loadTasks(project);
    setCurrentView("detail");
    setActiveRole(Role.ALL);
  };

  const loadTasks = (project: Project) => {
    if (project.task_states) {
      setCompletedTasks(new Set<string>(project.task_states.completed || []));
      const linkMap = new Map<string, { url: string; label: string }>();
      Object.entries(project.task_states.links || {}).forEach(
        ([id, val]: [string, any]) => linkMap.set(id, val),
      );
      setTaskLinks(linkMap);
      return;
    }

    const localTasks = localStorage.getItem(`tasks_${project.id}`);
    if (localTasks) {
      const parsed = JSON.parse(localTasks);
      setCompletedTasks(new Set<string>(parsed.completed || []));
      const linkMap = new Map<string, { url: string; label: string }>();
      Object.entries(parsed.links || {}).forEach(([id, val]: [any, any]) =>
        linkMap.set(id, val),
      );
      setTaskLinks(linkMap);
    } else {
      setCompletedTasks(new Set<string>());
      setTaskLinks(new Map<string, { url: string; label: string }>());
    }
  };

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

  const updateProjectInfo = (updates: Partial<Project>) => {
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
    syncProjectToSupabase(updatedProject);

    showToast("프로젝트 정보 저장 완료");
  };

  const getVisibleTasks = (
    stepId: number,
    project: Project,
    roundCount: number,
  ) => {
    const stepCustomTasks = project.custom_tasks?.[stepId] || [];
    const deletedSet = new Set(project.deleted_tasks || []);
    const hiddenSet = new Set(project.task_states?.meta?.hidden_template_tasks || []);
    let allVisibleTasks: Task[] = [];

    if (stepId === 2) {
      const roundCount = project.rounds_navigation_count || 1;
      const roundTasks = Array.from({ length: roundCount }).flatMap(
        (_, rIdx) => {
          const propId = `t2-round-${rIdx + 1}-prop`;
          const feedId = `t2-round-${rIdx + 1}-feed`;
          const rTs = [];
          if (!deletedSet.has(propId) && !hiddenSet.has(propId)) {
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
          if (!deletedSet.has(feedId) && !hiddenSet.has(feedId)) {
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
    } else if (stepId === 3) {
      const baseTask = STEPS_STATIC[2].tasks[0];
      const finalTask = STEPS_STATIC[2].tasks[1];
      const roundTasks = Array.from({ length: roundCount }).flatMap(
        (_, rIdx) => {
          const pmId = `t3-round-${rIdx + 1}-pm`;
          const desId = `t3-round-${rIdx + 1}-des`;
          const rTs = [];
          if (!deletedSet.has(pmId) && !hiddenSet.has(pmId))
            rTs.push(
              stepCustomTasks.find((ct) => ct.id === pmId) || {
                id: pmId,
                roles: [Role.PM],
                title: `${rIdx + 1}차 피드백 수급`,
                completed_date: "00-00-00",
              },
            );
          if (!deletedSet.has(desId) && !hiddenSet.has(desId))
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
        (ct) =>
          !["t3-base-1", "t3-final"].includes(ct.id) &&
          !ct.id.includes("-round-"),
      );

      if (!deletedSet.has("t3-base-1") && !hiddenSet.has("t3-base-1"))
        allVisibleTasks.push(
          stepCustomTasks.find((t) => t.id === "t3-base-1") || baseTask,
        );
      allVisibleTasks = [...allVisibleTasks, ...roundTasks, ...onlyCustoms];
      if (!deletedSet.has("t3-final") && !hiddenSet.has("t3-final"))
        allVisibleTasks.push(
          stepCustomTasks.find((t) => t.id === "t3-final") || finalTask,
        );
    } else if (stepId === 4) {
      const roundCount2 = project.rounds2_count || 2;
      const roundTasks = Array.from({ length: roundCount2 }).flatMap(
        (_, rIdx) => {
          const pmId = `t4-round-${rIdx + 1}-pm`;
          const desId = `t4-round-${rIdx + 1}-des`;
          const rTs = [];
          if (!deletedSet.has(pmId) && !hiddenSet.has(pmId))
            rTs.push(
              stepCustomTasks.find((ct) => ct.id === pmId) || {
                id: pmId,
                roles: [Role.PM],
                title: `${rIdx + 1}차 피드백 수급`,
                completed_date: "00-00-00",
              },
            );
          if (!deletedSet.has(desId) && !hiddenSet.has(desId))
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
        .filter((st) => !deletedSet.has(st.id) && !hiddenSet.has(st.id))
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
  };

  const isLockedStep = (stepId: number): boolean => {
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
  };

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

  const handleDeleteTask = (taskId: string) => {
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

      updateProjectProgress(nextCompleted, updatedProject);
      showToast("태스크가 삭제되었습니다.");
    }
  };

  const findTaskInProject = (taskId: string): Task | null => {
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
  };

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

  const updateProjectProgress = async (
    nextCompleted: Set<string>,
    project: Project,
    nextLinks?: Map<string, { url: string; label: string }>,
  ) => {
    const currentLinks = nextLinks || taskLinks;
    syncTasks(project, nextCompleted, currentLinks); // Save to local backup
    const total = calculateTotalTasks(project);
    const percent =
      total === 0 ? 0 : Math.round((nextCompleted.size / total) * 100);
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
    saveProjectsLocal(
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
        console.error("Failed to sync project progress to Supabase:", err);
      }
    }
  };

  const calculateTotalTasks = (project: Project) => {
    let count = 0;
    const deletedSet = new Set(project.deleted_tasks || []);
    STEPS_STATIC.forEach((step) => {
      if (step.id === 2) {
        const roundCount = project.rounds_navigation_count || 1;
        for (let r = 1; r <= roundCount; r++) {
          if (!deletedSet.has(`t2-round-${r}-prop`)) count += 1;
          if (!deletedSet.has(`t2-round-${r}-feed`)) count += 1;
        }
      } else if (step.id === 3) {
        if (!deletedSet.has("t3-base-1")) count += 1;
        if (!deletedSet.has("t3-final")) count += 1;
        const roundCount = project.rounds_count || 2;
        for (let r = 1; r <= roundCount; r++) {
          if (!deletedSet.has(`t3-round-${r}-pm`)) count += 1;
          if (!deletedSet.has(`t3-round-${r}-des`)) count += 1;
        }
      } else if (step.id === 4) {
        const roundCount2 = project.rounds2_count || 2;
        for (let r = 1; r <= roundCount2; r++) {
          if (!deletedSet.has(`t4-round-${r}-pm`)) count += 1;
          if (!deletedSet.has(`t4-round-${r}-des`)) count += 1;
        }
      } else {
        step.tasks.forEach((t) => {
          if (!deletedSet.has(t.id)) count += 1;
        });
      }
      if (project.custom_tasks?.[step.id]) {
        count += project.custom_tasks[step.id].filter(
          (t) => !t.id.startsWith("t"),
        ).length;
      }
    });
    return count;
  };

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
    if (isLockedStep(stepId)) {
      showToast("이전 스텝 완료가 필요합니다.");
      return;
    }
    const nextCustomTasks = { ...(currentProject.custom_tasks || {}) };
    const newTask: Task = {
      id: `custom-${stepId}-${Date.now()}`,
      roles: [Role.PM],
      title: "새로운 태스크",
      description: "",
      hasFile: true,
      completed_date: "00-00-00",
    };
    nextCustomTasks[stepId] = [...(nextCustomTasks[stepId] || []), newTask];
    const nextTaskOrder = { ...(currentProject.task_order || {}) };
    const currentOrder =
      nextTaskOrder[stepId] ||
      getVisibleTasks(stepId, currentProject, rounds).map((t) => t.id);
    nextTaskOrder[stepId] = [...currentOrder, newTask.id];
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

  const handleReorderTasks = async (
    stepId: number,
    fromIdx: number,
    toIdx: number,
  ) => {
    if (!currentProject || currentProject.is_locked) return;
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
          const partnerSuffix = task.id.includes("-pm") ? "-des" : "-feed";
          const currentSuffix = task.id.includes("-pm") ? "-pm" : "-prop";

          if (
            next &&
            next.id === task.id.replace(currentSuffix, partnerSuffix)
          ) {
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
      nextTaskOrder[stepId] = flattened.map((t) => t.id);
      const updatedProject = {
        ...currentProject,
        task_order: nextTaskOrder,
        last_updated: new Date().toISOString(),
      };
      setCurrentProject(updatedProject);

      const nextProjects = projects.map((p) =>
        p.id === currentProject.id ? updatedProject : p,
      );
      setProjects(nextProjects);
      localStorage.setItem("grafy_projects", JSON.stringify(nextProjects));
      await syncProjectToSupabase(updatedProject);
      return;
    }
    const result = Array.from(allVisibleTasks);
    const [removed] = result.splice(fromIdx, 1);
    result.splice(toIdx, 0, removed);
    const nextTaskOrder = { ...(currentProject.task_order || {}) };
    nextTaskOrder[stepId] = result.map((t) => t.id);
    const updatedProject = {
      ...currentProject,
      task_order: nextTaskOrder,
      last_updated: new Date().toISOString(),
    };
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
      console.error("Cannot determine step for task", taskId);
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
    const [dLead, d1, d2] = designers;

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
        };
        await supabase.from("projects").insert(projectToSave);
      }
    } catch (e) {
      console.error("New project save error:", e);
      showToast("프로젝트 저장 중 오류가 발생했으나 로컬에는 저장되었습니다.");
    }

    setShowCreateModal(false);
    selectProject(newProject);
    showToast("프로젝트가 생성되었습니다.");
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
            template_name: template_name,
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
        console.error("Template save error object:", error);
        throw new Error(error.message || "Unknown Supabase error");
      }

      showToast("템플릿이 저장되었습니다.");
      fetchProjects(true); // Refresh templates silently
    } catch (e: any) {
      console.error("Template Save Exception:", e);
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
      console.error("Project update error:", e);
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
        let lastGroupName = "";
        const exportTaskGroups: Record<string, string> = {}; // Track groups for export

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

          visibleTasks.forEach((task, taskIdx) => {
            const taskLink = currentProject.task_states?.links?.[task.id];
            const isCompleted = completedTasks.has(task.id);
            const isClientVisible = currentProject.client_visible_tasks?.includes(task.id) || false;

            // Determine group name based on task ID pattern
            let groupName = "";
            const roundMatch = task.id.match(/t([234])-round-(\d+)-(pm|prop|des|feed)/);
            if (roundMatch) {
              const roundNum = roundMatch[2];
              groupName = `${roundNum}차 제안_Ver${roundNum}.0`;
              exportTaskGroups[task.id] = groupName;
            }

            // Format todos as checklist with checkmarks
            const todosText =
              task.todos && task.todos.length > 0
                ? task.todos
                    .map((t) => `${t.isCompleted ? "☑" : "☐"} ${t.text}`)
                    .join("\n")
                : "";

            // Use "/" if step title is same as previous row
            const displayStepTitle = taskIdx === 0 ? stepTitle : "/";
            const displayIndex = taskIdx === 0 ? `Step ${stepIdx + 1}` : "/";
            const displayGroup = groupName && groupName === lastGroupName ? "/" : groupName;

            if (groupName) {
              lastGroupName = groupName;
            }

            tasksData.push({
              Index: displayIndex,
              스텝: displayStepTitle,
              그룹: displayGroup,
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

        // Save group metadata to project
        const updatedMeta = {
          ...(currentProject.task_states?.meta || {}),
          task_groups: exportTaskGroups,
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
        const nextTaskGroups: Record<string, string> = {}; // taskId -> groupName
        const nextClientVisibleTasks: string[] = [...(updatedProjectInfo.client_visible_tasks || [])];
        const nextHiddenTemplateTasks: string[] = [];
        const usedTemplateIdsInThisImport = new Set<string>();
        const processedSteps = new Set<number>(); // Track steps found in Excel to reset them

        let currentStepId: number | null = null;
        let currentStepTitle: string | null = null;
        let currentGroupName: string | null = null;

        tasksData.forEach((row: any) => {
          // Identify step from Index or 스텝 title
          const indexVal = row["Index"] || "";
          const stepVal = row["스텝"] || "";

          if (indexVal.startsWith("Step ")) {
            const stepNum = parseInt(indexVal.replace("Step ", ""));
            if (!isNaN(stepNum)) {
              currentStepId = stepNum;
            }
          }

          if (!currentStepId) return;

          // NEW: Reset this step's tasks if it's the first time we see it in this import
          if (!processedSteps.has(currentStepId)) {
            nextCustomTasks[currentStepId] = [];
            nextTaskOrder[currentStepId] = [];
            processedSteps.add(currentStepId);
          }

          // Update step title if explicitly changed (not "/")
          if (stepVal && stepVal !== "/") {
            currentStepTitle = stepVal;
            nextStepTitles[currentStepId] = stepVal;
          }

          // Parse group name
          const groupVal = row["그룹"];
          if (groupVal && groupVal !== "/") {
            currentGroupName = groupVal;
          }

          const title = row["태스크명"];
          if (!title) return;

          const description = row["설명"] || "";
          const completedDate = row["완료일"] || "00-00-00";
          const isCompleted = row["완료여부"] === "완료";
          const clientVisible = row["클라이언트공개"] === "O";

          // Parse roles
          const rolesStr = row["담당자"] || "";
          const roles: Role[] = rolesStr
            .split(",")
            .map((r: string) => {
              const cleaned = r.trim();
              if (cleaned.includes("PM")) return Role.PM;
              if (cleaned.includes("디자이너")) return Role.DESIGNER;
              if (cleaned.includes("클라이언트")) return Role.CLIENT;
              if (cleaned.includes("매니저")) return Role.MANAGER;
              if (cleaned.includes("개발자")) return Role.DEVELOPER;
              return null;
            })
            .filter((r: Role | null) => r !== null);

          // Parse todos
          const 할일Raw = row["할일"] || "";
          const todos = 할일Raw
            .split("\n")
            .filter((line: string) => line.trim())
            .map((line: string) => {
              const isComp = line.startsWith("☑");
              const text = line.replace(/^[☑☐]\s*/, "").trim();
              return {
                id: crypto.randomUUID(),
                text,
                isCompleted: isComp,
              };
            });

          // Search in static tasks
          const staticStep = STEPS_STATIC.find((s) => s.id === currentStepId);
          const staticTask = staticStep?.tasks?.find((t) => t.title === title);

          let taskId: string;

          if (staticTask) {
            taskId = staticTask.id;
            const newTask = {
              ...staticTask,
              description,
              completed_date: completedDate,
              todos,
              roles: roles.length > 0 ? roles : staticTask.roles
            };
            nextCustomTasks[currentStepId].push(newTask);
            if (isCompleted) newCompletedTasks.add(taskId);
            else newCompletedTasks.delete(taskId);

            const linkUrl = row["링크"] || "";
            const linkLabel = row["링크라벨"] || "";
            if (linkUrl) newTaskLinks.set(taskId, { url: linkUrl, label: linkLabel });
          } else {
            // Check if it's a known round-based task ID pattern (but matched by title)
            // For true 1:1 sync, we treat unmatched titles as new custom tasks
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
            
            if (isCompleted) newCompletedTasks.add(taskId);
            const linkUrl = row["링크"] || "";
            const linkLabel = row["링크라벨"] || "";
            if (linkUrl) newTaskLinks.set(taskId, { url: linkUrl, label: linkLabel });
          }

          // Track order as it appears in Excel
          nextTaskOrder[currentStepId].push(taskId);

          if (currentGroupName) {
            nextTaskGroups[taskId] = currentGroupName;
          }
          
          if (!taskId.startsWith('custom-')) {
            usedTemplateIdsInThisImport.add(taskId);
          }

          // Track client visibility
          if (clientVisible) {
            if (!nextClientVisibleTasks.includes(taskId)) nextClientVisibleTasks.push(taskId);
          } else {
            const idx = nextClientVisibleTasks.indexOf(taskId);
            if (idx > -1) nextClientVisibleTasks.splice(idx, 1);
          }
        });

        // Comprehensive Hidden Task Check (Static + Rounds 1-10)
        STEPS_STATIC.forEach(step => {
          step.tasks.forEach(t => {
            if (!usedTemplateIdsInThisImport.has(t.id)) nextHiddenTemplateTasks.push(t.id);
          });
        });
        
        // Handle all possible round-based IDs to ensure they are hidden if not in Excel
        for (let r = 1; r <= 10; r++) {
          [`t2-round-${r}-prop`, `t2-round-${r}-feed`, `t3-round-${r}-pm`, `t3-round-${r}-des`, `t4-round-${r}-pm`, `t4-round-${r}-des`]
            .forEach(id => {
              if (!usedTemplateIdsInThisImport.has(id)) nextHiddenTemplateTasks.push(id);
            });
        }

        // Prepare final updated metadata and task states
        const finalMeta = {
          ...(updatedProjectInfo.task_states?.meta || {}),
          step_titles: nextStepTitles,
          custom_tasks: nextCustomTasks,
          task_groups: nextTaskGroups,
          hidden_template_tasks: nextHiddenTemplateTasks,
        };

        // Merge task_order with Excel order
        const mergedTaskOrder = { ...(updatedProjectInfo.task_order || {}) };
        Object.keys(nextTaskOrder).forEach((stepIdStr) => {
          const stepId = parseInt(stepIdStr);
          mergedTaskOrder[stepId] = nextTaskOrder[stepId];
        });

        const finalTaskStates = {
          ...updatedProjectInfo.task_states,
          completed: Array.from(newCompletedTasks),
          links: Object.fromEntries(newTaskLinks),
          meta: finalMeta,
        };

        // Calculate new progress status using the updated structure
        const total = calculateTotalTasks({
          ...updatedProjectInfo,
          custom_tasks: nextCustomTasks,
          task_states: finalTaskStates,
        });
        const percent = total === 0 ? 0 : Math.round((newCompletedTasks.size / total) * 100);

        const updatedProject = {
          ...updatedProjectInfo,
          task_states: finalTaskStates,
          custom_tasks: nextCustomTasks,
          task_order: mergedTaskOrder,
          client_visible_tasks: nextClientVisibleTasks,
          status: Math.min(100, percent),
          last_updated: new Date().toISOString(),
        };

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

  return (
    <div className="min-h-screen pb-20 bg-[#e3e7ed] selection:bg-black selection:text-white">
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
              onClick={() => setIsSnapshotMode(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSaveSnapshot}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-white text-black hover:bg-slate-200 transition-colors shadow-sm"
            >
              결정 완료
            </button>
          </div>
        </div>
      )}

      {currentView === "welcome" && !isInitializing && (
        <WelcomeScreen onLogin={handleGoogleLogin} isLoading={isAuthLoading} />
      )}

      {isInitializing && (
        <div className="min-h-screen flex items-center justify-center bg-[#e3e7ed]">
          <div className="flex flex-col items-center gap-4">
            <i className="fa-solid fa-plane text-4xl text-black animate-airplane-pulse"></i>
            <p className="text-black font-bold">탑승 수속 중...</p>
          </div>
        </div>
      )}

      {currentView === "share" && sharedProjectId && (
        <SharedProjectView projectId={sharedProjectId} />
      )}

      {currentView === "list" &&
        !window.location.search.includes("project=") && (
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
              deletedProjects={deletedProjects}
              onRestoreProject={handleRestoreProject}
              onUpdateProject={handleUpdateProject}
              templates={templates}
              onManageDeletedData={() => setShowDeletedDataModal(true)}
              onManageTemplates={() => setShowTemplateManagerModal(true)}
            />
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
                onUpdate={(t) => {
                  setTeamMembers(t);
                  localStorage.setItem("grafy_team", JSON.stringify(t));
                  showToast("팀 명단 저장");
                }}
              />
            )}
          </>
        )}

      {currentView === "detail" && currentProject && (
        <div
          className="relative"
          onClick={() => {
            setPopover((p) => ({ ...p, isOpen: false }));
            setTaskEditPopover((p) => ({ ...p, isOpen: false }));
          }}
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
          <main className="w-full px-4 md:px-6 py-10 max-w-[2100px] mx-auto">
            <div className="max-w-[2100px] mx-auto">
              {/* Progress Section */}
              <div className="bg-white p-6 md:p-8 rounded-[1.25rem] md:rounded-[1.5rem] mb-6 md:mb-10 flex flex-col md:flex-row items-center gap-6 md:gap-10 border border-slate-200 shadow-sm relative overflow-visible">
                <div className="shrink-0 relative z-10 w-full md:w-auto text-center md:text-left">
                  <span className="text-[18px] md:text-[24px] font-bold text-black leading-none uppercase tracking-tighter">
                    PROJECT JOURNEY
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
              <div className="overflow-x-auto pb-8 no-scrollbar scroll-smooth">
                <div className="flex gap-2 md:gap-4 min-w-max md:min-w-0 md:w-full px-0">
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
                        taskGroups={
                          currentProject.task_states?.meta?.task_groups || {}
                        }
                      >
                        {step.id === 2 && (
                          <div className="flex justify-center gap-2 md:gap-3 py-1">
                            <button
                              onClick={() =>
                                roundsNavigation > 2 &&
                                handleUpdateRoundsNavigation(
                                  roundsNavigation - 1,
                                )
                              }
                              className={`w-10 h-10 md:w-12 md:h-12 rounded-full bg-white border border-slate-300 shadow-lg transition-all flex items-center justify-center text-black font-bold active:scale-90 ${currentProject?.is_locked || roundsNavigation <= 2 ? "opacity-50 cursor-not-allowed" : "hover:border-black"}`}
                              disabled={
                                currentProject?.is_locked ||
                                roundsNavigation <= 2
                              }
                            >
                              <i className="fa-solid fa-minus"></i>
                            </button>
                            <button
                              onClick={() =>
                                handleUpdateRoundsNavigation(
                                  roundsNavigation + 1,
                                )
                              }
                              className={`w-10 h-10 md:w-12 md:h-12 rounded-full bg-black text-white shadow-lg transition-all flex items-center justify-center text-sm active:scale-90 ${currentProject?.is_locked ? "opacity-50 cursor-not-allowed" : ""}`}
                              disabled={currentProject?.is_locked}
                            >
                              <i className="fa-solid fa-plus"></i>
                            </button>
                          </div>
                        )}
                        {step.id === 3 && (
                          <div className="flex justify-center gap-2 md:gap-3 py-1">
                            <button
                              onClick={() =>
                                rounds > 2 && handleUpdateRounds(rounds - 1)
                              }
                              className={`w-10 h-10 md:w-12 md:h-12 rounded-full bg-white border border-slate-300 shadow-lg transition-all flex items-center justify-center text-black font-bold active:scale-90 ${currentProject?.is_locked || rounds <= 2 ? "opacity-50 cursor-not-allowed" : "hover:border-black"}`}
                              disabled={
                                currentProject?.is_locked || rounds <= 2
                              }
                            >
                              <i className="fa-solid fa-minus"></i>
                            </button>
                            <button
                              onClick={() => handleUpdateRounds(rounds + 1)}
                              className={`w-10 h-10 md:w-12 md:h-12 rounded-full bg-black text-white shadow-lg transition-all flex items-center justify-center text-sm active:scale-90 ${currentProject?.is_locked ? "opacity-50 cursor-not-allowed" : ""}`}
                              disabled={currentProject?.is_locked}
                            >
                              <i className="fa-solid fa-plus"></i>
                            </button>
                          </div>
                        )}
                        {step.id === 4 && (
                          <div className="flex justify-center gap-2 md:gap-3 py-1">
                            <button
                              onClick={() =>
                                rounds2 > 2 && handleUpdateRounds2(rounds2 - 1)
                              }
                              className={`w-10 h-10 md:w-12 md:h-12 rounded-full bg-white border border-slate-300 shadow-lg transition-all flex items-center justify-center text-black font-bold active:scale-90 ${currentProject?.is_locked || rounds2 <= 2 ? "opacity-50 cursor-not-allowed" : "hover:border-black"}`}
                              disabled={
                                currentProject?.is_locked || rounds2 <= 2
                              }
                            >
                              <i className="fa-solid fa-minus"></i>
                            </button>
                            <button
                              onClick={() => handleUpdateRounds2(rounds2 + 1)}
                              className={`w-10 h-10 md:w-12 md:h-12 rounded-full bg-black text-white shadow-lg transition-all flex items-center justify-center text-sm active:scale-90 ${currentProject?.is_locked ? "opacity-50 cursor-not-allowed" : ""}`}
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
            toastMsg.includes("이전 스텝")
              ? "bg-red-500"
              : toastMsg.includes("저장 완료")
                ? "bg-[#05D686]"
                : "bg-black"
          }`}
        >
          {toastMsg.includes("이전 스텝") ? (
            <i className="fa-solid fa-circle-xmark text-white"></i>
          ) : toastMsg.includes("저장 완료") ? (
            <i className="fa-solid fa-circle-check text-white"></i>
          ) : (
            <i className="fa-solid fa-circle-info text-white"></i>
          )}
          {toastMsg}
        </div>
      )}

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
