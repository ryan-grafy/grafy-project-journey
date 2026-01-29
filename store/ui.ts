import { create } from "zustand";
import { Role } from "../types";
import type { PopoverState, TaskEditPopoverState } from "../types";
 
type UIState = {
  rounds: number;
  rounds2: number;
  roundsNavigation: number;
  toastMsg: string | null;
  activeRole: Role;
  isSnapshotMode: boolean;
  snapshotSelectedTasks: Set<string>;
  confirmHideExpedition2: boolean;
  popover: PopoverState;
  taskEditPopover: TaskEditPopoverState;
  showCreateModal: boolean;
  showTeamModal: boolean;
  showTemplateSaveModal: boolean;
  showDeletedDataModal: boolean;
  showTemplateManagerModal: boolean;
};
 
type UIActions = {
  setRounds: (rounds: number) => void;
  setRounds2: (rounds2: number) => void;
  setRoundsNavigation: (roundsNavigation: number) => void;
  setToastMsg: (toastMsg: string | null) => void;
  setActiveRole: (activeRole: Role) => void;
  setIsSnapshotMode: (isSnapshotMode: boolean) => void;
  setSnapshotSelectedTasks: (snapshotSelectedTasks: Set<string>) => void;
  setConfirmHideExpedition2: (confirmHideExpedition2: boolean) => void;
  setPopover: (popover: PopoverState) => void;
  setTaskEditPopover: (taskEditPopover: TaskEditPopoverState) => void;
  setShowCreateModal: (showCreateModal: boolean) => void;
  setShowTeamModal: (showTeamModal: boolean) => void;
  setShowTemplateSaveModal: (showTemplateSaveModal: boolean) => void;
  setShowDeletedDataModal: (showDeletedDataModal: boolean) => void;
  setShowTemplateManagerModal: (showTemplateManagerModal: boolean) => void;
};
 
export type UIStore = UIState & UIActions;
 
export const useUIStore = create<UIStore>((set) => ({
  rounds: 2,
  rounds2: 2,
  roundsNavigation: 2,
  toastMsg: null,
  activeRole: Role.ALL,
  isSnapshotMode: false,
  snapshotSelectedTasks: new Set(),
  confirmHideExpedition2: false,
  popover: {
    isOpen: false,
    taskId: null,
    currentUrl: "",
    currentLabel: "",
    x: 0,
    y: 0,
  },
  taskEditPopover: {
    isOpen: false,
    taskId: null,
    roles: [Role.PM],
    title: "",
    description: "",
    completed_date: "00-00-00",
    x: 0,
    y: 0,
  },
  showCreateModal: false,
  showTeamModal: false,
  showTemplateSaveModal: false,
  showDeletedDataModal: false,
  showTemplateManagerModal: false,
  setRounds: (rounds) => set({ rounds }),
  setRounds2: (rounds2) => set({ rounds2 }),
  setRoundsNavigation: (roundsNavigation) => set({ roundsNavigation }),
  setToastMsg: (toastMsg) => set({ toastMsg }),
  setActiveRole: (activeRole) => set({ activeRole }),
  setIsSnapshotMode: (isSnapshotMode) => set({ isSnapshotMode }),
  setSnapshotSelectedTasks: (snapshotSelectedTasks) => set({ snapshotSelectedTasks }),
  setConfirmHideExpedition2: (confirmHideExpedition2) => set({ confirmHideExpedition2 }),
  setPopover: (popover) => set({ popover }),
  setTaskEditPopover: (taskEditPopover) => set({ taskEditPopover }),
  setShowCreateModal: (showCreateModal) => set({ showCreateModal }),
  setShowTeamModal: (showTeamModal) => set({ showTeamModal }),
  setShowTemplateSaveModal: (showTemplateSaveModal) => set({ showTemplateSaveModal }),
  setShowDeletedDataModal: (showDeletedDataModal) => set({ showDeletedDataModal }),
  setShowTemplateManagerModal: (showTemplateManagerModal) => set({ showTemplateManagerModal }),
}));

// Convenience helpers for accessing specific state values
export const uiToastMsg = () => useUIStore.getState().toastMsg;
export const uiSetToastMsg = (msg: string | null) => useUIStore.setState({ toastMsg: msg });
export const uiShowCreateModal = () => useUIStore.setState({ showCreateModal: true });
export const uiHideCreateModal = () => useUIStore.setState({ showCreateModal: false });
export const uiShowTeamModal = () => useUIStore.setState({ showTeamModal: true });
export const uiHideTeamModal = () => useUIStore.setState({ showTeamModal: false });
export const uiShowTemplateSaveModal = () => useUIStore.setState({ showTemplateSaveModal: true });
export const uiHideTemplateSaveModal = () => useUIStore.setState({ showTemplateSaveModal: false });
export const uiShowDeletedDataModal = () => useUIStore.setState({ showDeletedDataModal: true });
export const uiHideDeletedDataModal = () => useUIStore.setState({ showDeletedDataModal: false });
export const uiShowTemplateManagerModal = () => useUIStore.setState({ showTemplateManagerModal: true });
export const uiHideTemplateManagerModal = () => useUIStore.setState({ showTemplateManagerModal: false });

export default useUIStore;
