
export enum Role {
  ALL = 'all',
  CLIENT = 'client',
  PM = 'pm',
  DESIGNER = 'designer',
  MANAGER = 'manager',
  DEVELOPER = 'developer'
}

export interface User {
  id: string;
  userId: string;
  name: string;
  avatarUrl?: string;
  password?: string;
  email?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  title: string;
  phone: string;
  email: string;
}

export interface Log {
  id: string;
  timestamp: string;
  userName: string;
  projectName: string;
  action: string;
  details: string;
}

export interface Task {
  id: string;
  roles: Role[]; // Changed from role for multi-selection
  title: string;
  description?: string;
  hasFile?: boolean;
  toolLabel?: string;
  toolIcon?: string;
  isDynamic?: boolean;
  completed_date?: string; // Manually entryable date
}

export interface Step {
  id: number;
  title: string;
  colorClass: string;
  borderColorClass: string;
  tasks: Task[];
}

export interface PopoverState {
  isOpen: boolean;
  taskId: string | null;
  currentUrl: string;
  currentLabel: string;
  x: number;
  y: number;
}

export interface TaskEditPopoverState {
  isOpen: boolean;
  taskId: string | null;
  roles: Role[]; // Changed from role
  title: string;
  description: string;
  completed_date: string;
  x: number;
  y: number;
}

export interface Project {
  id: string;
  created_at: string;
  name: string;
  pm_name: string;
  pm_phone?: string;
  pm_email?: string;
  designer_name: string; // Designer A
  designer_phone?: string;
  designer_email?: string;
  designer_2_name?: string; // Designer B
  designer_2_phone?: string;
  designer_2_email?: string;
  designer_3_name?: string; // Designer C
  designer_3_phone?: string;
  designer_3_email?: string;
  status: number;
  last_updated: string;
  rounds_count: number;
  rounds2_count?: number; // Expedition 2 rounds
  rounds_navigation_count?: number; // Navigation rounds
  is_locked?: boolean;
  custom_tasks?: Record<number, Task[]>;
  task_order?: Record<number, string[]>;
  deleted_tasks?: string[]; // IDs of hidden/deleted tasks
  start_date?: string; // Project start date
  end_date?: string; // Project completion/lock date
  task_states?: {
    completed: string[];
    links: Record<string, { url: string; label: string }>;
    meta?: any;
  };
  client_visible_tasks?: string[]; // IDs of tasks visible to clients
  template_name?: string; // Name of the template used to create the project
}
