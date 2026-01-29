import { create } from "zustand";
import type { User } from "../types";
 
export type AuthView = "welcome" | "list" | "detail" | "share";
 
type AuthState = {
  user: User;
  currentView: AuthView;
  isInitializing: boolean;
  isAuthLoading: boolean;
};
 
type AuthActions = {
  setUser: (user: User) => void;
  setCurrentView: (view: AuthView) => void;
  setIsInitializing: (isInitializing: boolean) => void;
  setIsAuthLoading: (isAuthLoading: boolean) => void;
};
 
export type AuthStore = AuthState & AuthActions;
 
const guestUser: User = {
  id: "guest",
  userId: "guest",
  name: "게스트",
  avatarUrl: "",
};
 
export const useAuthStore = create<AuthStore>((set) => ({
  user: guestUser,
  currentView: "welcome",
  isInitializing: true,
  isAuthLoading: false,
  setUser: (user) => set({ user }),
  setCurrentView: (view) => set({ currentView: view }),
  setIsInitializing: (isInitializing) => set({ isInitializing }),
  setIsAuthLoading: (isAuthLoading) => set({ isAuthLoading }),
}));

// Convenience helpers for accessing specific state values
export const authUser = () => useAuthStore.getState().user;
export const authCurrentView = () => useAuthStore.getState().currentView;
export const authIsInitializing = () => useAuthStore.getState().isInitializing;
export const authIsAuthLoading = () => useAuthStore.getState().isAuthLoading;
export const authSetUser = (user: User) => useAuthStore.setState({ user });
export const authSetCurrentView = (view: AuthView) => useAuthStore.setState({ currentView: view });
export const authSetIsInitializing = (loading: boolean) => useAuthStore.setState({ isInitializing: loading });
export const authSetIsAuthLoading = (loading: boolean) => useAuthStore.setState({ isAuthLoading: loading });

export default useAuthStore;
