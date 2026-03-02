'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthState, User, FamilyGroup, List, UserSettings } from '@/types'

interface AuthStore extends AuthState {
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  setCurrentGroup: (group: FamilyGroup | null) => void
  setCurrentList: (list: List | null) => void
  setSettings: (settings: UserSettings | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      currentGroup: null,
      currentList: null,
      settings: null,
      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
        }),
      setLoading: (isLoading) => set({ isLoading }),
      setCurrentGroup: (currentGroup) => set({ currentGroup, currentList: null }),
      setCurrentList: (currentList) => set({ currentList }),
      setSettings: (settings) => set({ settings }),
      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          currentGroup: null,
          currentList: null,
          settings: null,
        }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        currentGroup: state.currentGroup,
        currentList: state.currentList,
        settings: state.settings,
      }),
    }
  )
)
