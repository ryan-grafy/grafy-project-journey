// Task helper functions
import { Role, Project, Task } from '../types';

export const getVisibleTasks = (
  stepId: number,
  project: Project,
  roundCount: number,
  activeRole: Role,
): Task[] => {
  if (!project) return [];
  
  const tasks = project.custom_tasks?.[stepId] ?? [];
  const taskIds = project.task_order?.[stepId] ?? [];
  const deletedTasks = project.deleted_tasks ?? [];
  
  return tasks.filter((task) => {
    const isDeleted = deletedTasks.includes(task.id);
    if (isDeleted) return false;
    
    const isVisible = project.client_visible_tasks?.includes(task.id) ?? true;
    if (!isVisible) return false;
    
    const hasRole = task.roles.length === 0 || task.roles.includes(Role.ALL) || task.roles.includes(activeRole);
    return hasRole;
  });
};

export const calculateTotalTasks = (project: Project): number => {
  if (!project) return 0;
  
  let total = 0;
  for (let stepId = 1; stepId <= 5; stepId++) {
    const stepTasks = getVisibleTasks(stepId, project, 2, Role.ALL);
    total += stepTasks.length;
  }
  
  return total;
};

export const findTaskInProject = (
  project: Project | null,
  taskId: string,
): Task | null => {
  if (!project) return null;
  
  for (let stepId = 1; stepId <= 5; stepId++) {
    const stepTasks = project.custom_tasks?.[stepId] ?? [];
    const task = stepTasks.find((t) => t.id === taskId);
    if (task) return task;
  }
  
  return null;
};
