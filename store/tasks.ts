import { create } from "zustand";
 
type TaskLink = { url: string; label: string };
 
type TasksState = {
  completedTasks: Set<string>;
  taskLinks: Map<string, TaskLink>;
};
 
type TasksActions = {
  setCompletedTasks: (completedTasks: Set<string>) => void;
  setTaskLinks: (taskLinks: Map<string, TaskLink>) => void;
};
 
export type TasksStore = TasksState & TasksActions;
 
export const useTasksStore = create<TasksStore>((set) => ({
  completedTasks: new Set<string>(),
  taskLinks: new Map<string, TaskLink>(),
  setCompletedTasks: (completedTasks) => set({ completedTasks }),
  setTaskLinks: (taskLinks) => set({ taskLinks }),
}));

export default useTasksStore;
