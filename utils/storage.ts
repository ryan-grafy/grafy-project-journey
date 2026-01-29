// Storage utility functions
export const saveLocalStorage = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to save to localStorage (key: ${key}):`, e);
  }
};

export const loadLocalStorage = <T>(key: string, fallback?: T): T | null => {
  try {
    const item = localStorage.getItem(key);
    if (item === null) return fallback ?? null;
    return JSON.parse(item) as T;
  } catch (e) {
    console.error(`Failed to load from localStorage (key: ${key}):`, e);
    return fallback ?? null;
  }
};

export const saveProjects = (projects: Project[]) => {
  saveLocalStorage("grafy_projects", projects);
};

export const saveTeamMembers = (teamMembers: TeamMember[]) => {
  saveLocalStorage("grafy_team", teamMembers);
};
