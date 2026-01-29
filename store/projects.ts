import { create } from "zustand";
import type { Project, TeamMember } from "../types";
 
type ProjectsState = {
  projects: Project[];
  deletedProjects: Project[];
  templates: Project[];
  currentProject: Project | null;
  teamMembers: TeamMember[];
};
 
type ProjectsActions = {
  setProjects: (projects: Project[]) => void;
  setDeletedProjects: (deletedProjects: Project[]) => void;
  setTemplates: (templates: Project[]) => void;
  setCurrentProject: (currentProject: Project | null) => void;
  setTeamMembers: (teamMembers: TeamMember[]) => void;
};
 
export type ProjectsStore = ProjectsState & ProjectsActions;
 
export const useProjectsStore = create<ProjectsStore>((set) => ({
  projects: [],
  deletedProjects: [],
  templates: [],
  currentProject: null,
  teamMembers: [],
  setProjects: (projects) => set({ projects }),
  setDeletedProjects: (deletedProjects) => set({ deletedProjects }),
  setTemplates: (templates) => set({ templates }),
  setCurrentProject: (currentProject) => set({ currentProject }),
  setTeamMembers: (teamMembers) => set({ teamMembers }),
}));

export default useProjectsStore;
