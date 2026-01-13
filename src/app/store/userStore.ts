'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface UserState {
  usernames: string[];
  visibleUsers: Set<string>;
  hydrated: boolean;
  addUsername: (username: string) => void;
  removeUsername: (username: string) => void;
  toggleUserVisibility: (username: string) => void;
  clearAllUsernames: () => void;
  setHydrated: (hydrated: boolean) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      usernames: [],
      visibleUsers: new Set<string>(),
      hydrated: false,
      addUsername: (username: string) => {
        const trimmed = username.trim();
        if (trimmed) {
          const current = get().usernames;
          if (!current.some(u => u.toLowerCase() === trimmed.toLowerCase())) {
            const newVisibleUsers = new Set(get().visibleUsers);
            newVisibleUsers.add(trimmed);
            set({ usernames: [...current, trimmed], visibleUsers: newVisibleUsers });
          }
        }
      },
      removeUsername: (username: string) => {
        const newVisibleUsers = new Set(get().visibleUsers);
        newVisibleUsers.delete(username);
        set({
          usernames: get().usernames.filter(u => u !== username),
          visibleUsers: newVisibleUsers
        });
      },
      toggleUserVisibility: (username: string) => {
        const newVisibleUsers = new Set(get().visibleUsers);
        if (newVisibleUsers.has(username)) {
          newVisibleUsers.delete(username);
        } else {
          newVisibleUsers.add(username);
        }
        set({ visibleUsers: newVisibleUsers });
      },
      clearAllUsernames: () => {
        set({ usernames: [], visibleUsers: new Set<string>() });
      },
      setHydrated: (hydrated: boolean) => {
        set({ hydrated });
      },
    }),
    {
      name: 'jira-user-storage',
      storage: {
        getItem: (name) => {
          if (typeof window === 'undefined') return null;
          const str = localStorage.getItem(name);
          if (!str) return null;
          const parsed = JSON.parse(str);
          // Convert visibleUsers array back to Set
          if (parsed?.state?.visibleUsers) {
            parsed.state.visibleUsers = new Set<string>(parsed.state.visibleUsers);
          }
          return parsed;
        },
        setItem: (name, value) => {
          if (typeof window === 'undefined') return;
          // Convert Set to array for storage
          const toStore = {
            ...value,
            state: {
              ...value.state,
              visibleUsers: value.state.visibleUsers instanceof Set
                ? Array.from(value.state.visibleUsers)
                : value.state.visibleUsers || [],
            },
          };
          localStorage.setItem(name, JSON.stringify(toStore));
        },
        removeItem: (name) => {
          if (typeof window !== 'undefined') {
            localStorage.removeItem(name);
          }
        },
      },
      skipHydration: true, // Skip automatic hydration
      // Handle migration from old format
      migrate: (persistedState: unknown) => {
        const state = persistedState as { username?: string; usernames?: string[]; visibleUsers?: string[] | Set<string> };
        let usernames: string[] = [];
        if (state?.username && !state?.usernames) {
          usernames = [state.username];
        } else {
          usernames = state?.usernames || [];
        }
        // Default all users to visible if visibleUsers not set
        const visibleUsers = state?.visibleUsers
          ? (state.visibleUsers instanceof Set ? state.visibleUsers : new Set<string>(state.visibleUsers))
          : new Set<string>(usernames);
        return { usernames, visibleUsers, hydrated: false };
      },
      version: 2,
    }
  )
);

// Export a function to manually trigger hydration
export const hydrateUserStore = () => {
  if (typeof window !== 'undefined') {
    useUserStore.persist.rehydrate();
  }
};
