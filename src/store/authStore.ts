import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PersonnelCard, DataSourceMode } from '@/types/models';
import { mockUsers } from '@/data/mockData';
import { verifyStaticCredential } from '@/lib/staticAuth';

interface AuthState {
  currentUser: PersonnelCard | null;
  users: PersonnelCard[];
  appMode: 'DAILY_WORK' | 'ADMIN_VALIDATION';
  setAppMode: (mode: 'DAILY_WORK' | 'ADMIN_VALIDATION') => void;
  dataSourceMode: DataSourceMode;
  setDataSourceMode: (mode: DataSourceMode) => void;
  lastActivity: number;
  updateLastActivity: () => void;
  loginAs: (userId: string) => void;
  loginWithCredentials: (identifier: string, password: string) => Promise<boolean>;
  loginError: string | null;
  isAuthenticating: boolean;
  rememberLogin: boolean;
  setRememberLogin: (rememberLogin: boolean) => void;
  clearLoginError: () => void;
  logout: () => void;
  addUser: (user: Omit<PersonnelCard, 'id'>) => void;
  updateUser: (userId: string, updates: Partial<PersonnelCard>) => void;
  deactivateUser: (userId: string) => void;
  replaceUsers: (users: PersonnelCard[]) => void;
  resetUsers: () => void;
  
  // Backend Integration (Phase 473+)
  fetchSession: () => Promise<void>;
  serverUser: unknown | null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentUser: null,
  users: mockUsers,
  appMode: 'DAILY_WORK',
  dataSourceMode: 'JSON_OPERATION_DATA',
  serverUser: null,
  loginError: null,
  isAuthenticating: false,
  rememberLogin: false,
  lastActivity: Date.now(),
  setRememberLogin: (rememberLogin) => set({ rememberLogin }),
  setAppMode: (mode) => set((state) => {
    // If switching to DAILY_WORK, ensure DEMO_SEED_DATA is deactivated
    if (mode === 'DAILY_WORK' && state.dataSourceMode === 'DEMO_SEED_DATA') {
      return { appMode: mode, dataSourceMode: 'JSON_OPERATION_DATA' };
    }
    return { appMode: mode };
  }),
  setDataSourceMode: (mode) => set((state) => {
    if (state.appMode === 'DAILY_WORK' && mode === 'DEMO_SEED_DATA') {
      console.warn("DEMO_SEED_DATA cannot be used in DAILY_WORK mode.");
      return state;
    }
    return { dataSourceMode: mode };
  }),
  updateLastActivity: () => set({ lastActivity: Date.now() }),
  loginAs: (userId: string) => {
    const user = useAuthStore.getState().users.find(u => u.id === userId);
    if (user) {
      // If switching to a user who is not admin, force DAILY_WORK mode
      if (!['SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(user.role)) {
        set({ currentUser: user, appMode: 'DAILY_WORK', lastActivity: Date.now() });
      } else {
        set({ currentUser: user, lastActivity: Date.now() });
      }
    }
  },
  loginWithCredentials: async (identifier, password) => {
    const normalized = identifier.trim().toLowerCase();
    set({ isAuthenticating: true, loginError: null });

    if (!normalized || password.length < 8) {
      set({
        isAuthenticating: false,
        loginError: '사번 또는 업무 이메일과 8자 이상의 비밀번호를 입력해 주세요.',
      });
      return false;
    }

    // Static demo credentials must keep working even when an older persisted
    // personnel snapshot does not yet contain the newly added account.
    const staticUserId = await verifyStaticCredential(normalized, password);
    if (staticUserId) {
      const users = useAuthStore.getState().users;
      const staticUser = users.find((candidate) => candidate.id === staticUserId)
        ?? mockUsers.find((candidate) => candidate.id === staticUserId);
      if (staticUser && staticUser.employmentStatus !== 'INACTIVE') {
        set((state) => ({
          currentUser: staticUser,
          users: state.users.some((candidate) => candidate.id === staticUser.id)
            ? state.users
            : [...state.users, staticUser],
          isAuthenticating: false,
          lastActivity: Date.now(),
        }));
        return true;
      }
    }

    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (apiBase) {
      try {
        const response = await fetch(`${apiBase.replace(/\/$/, '')}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email: identifier, identifier, password }),
        });
        if (!response.ok) throw new Error('AUTH_FAILED');
        const payload = await response.json();
        const user = payload.user as PersonnelCard;
        set({ currentUser: user, serverUser: user, isAuthenticating: false, lastActivity: Date.now() });
        return true;
      } catch {
        set({ isAuthenticating: false, loginError: '계정 정보가 올바르지 않거나 인증 서버에 연결할 수 없습니다.' });
        return false;
      }
    }

    const users = useAuthStore.getState().users;

    if (process.env.NODE_ENV !== 'production') {
      const user = users.find((candidate) =>
        candidate.id.toLowerCase() === normalized ||
        candidate.employeeNumber?.toLowerCase() === normalized ||
        candidate.email?.toLowerCase() === normalized ||
        candidate.name.toLowerCase() === normalized
      );
      if (user && password === 'Concost!2026' && user.employmentStatus !== 'INACTIVE') {
        set({ currentUser: user, isAuthenticating: false, lastActivity: Date.now() });
        return true;
      }
    }

    set({ isAuthenticating: false, loginError: '계정 정보가 올바르지 않습니다.' });
    return false;
  },
  clearLoginError: () => set({ loginError: null }),
  logout: () => set({ currentUser: null, appMode: 'DAILY_WORK', lastActivity: Date.now() }),
  addUser: (user) => set((state) => ({
    users: [...state.users, { ...user, id: `user-${Date.now()}` }]
  })),
  updateUser: (userId, updates) => set((state) => ({
    users: state.users.map(u => u.id === userId ? { ...u, ...updates } : u),
    currentUser: state.currentUser?.id === userId ? { ...state.currentUser, ...updates } : state.currentUser
  })),
  deactivateUser: (userId) => set((state) => ({
    users: state.users.map(u => u.id === userId ? { ...u, status: 'INACTIVE' } : u)
  })),
  replaceUsers: (users) => set({ users }),
  resetUsers: () => set({ users: mockUsers }),
  fetchSession: async () => {
    try {
      const { apiClient } = await import('@/lib/apiClient');
      const data = await apiClient('/auth/session');
      set({ serverUser: data.user });
    } catch {
      set({ serverUser: null });
    }
  }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        currentUser: state.rememberLogin ? state.currentUser : null,
        rememberLogin: state.rememberLogin,
        users: state.users,
        appMode: state.appMode,
        dataSourceMode: state.dataSourceMode
      }),
    }
  )
);
