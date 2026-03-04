'use client'

import { create } from 'zustand'
import type { UserSettings, ThemeColor } from '@/types'
import { themeColors } from '@/types'

interface SettingsStore {
  settings: UserSettings | null
  isLoading: boolean
  setSettings: (settings: UserSettings | null) => void
  setLoading: (loading: boolean) => void
  updateSettings: (updates: Partial<UserSettings>) => void
  applyTheme: () => void
  getThemeColor: (colorKey?: string) => ThemeColor
}

// Helper to convert hex to oklch
function hexToOklch(hex: string): string {
  // Simple mapping for known colors
  const colorMap: Record<string, string> = {
    '#98D8AA': 'oklch(0.75 0.14 162)', // mint
    '#FF6B6B': 'oklch(0.65 0.22 25)', // coral
    '#4ECDC4': 'oklch(0.70 0.12 185)', // ocean
    '#9B8AA6': 'oklch(0.62 0.08 300)', // lavender
    '#F7B267': 'oklch(0.75 0.14 70)', // sunset
    '#7EB5D6': 'oklch(0.70 0.10 220)', // sky
    '#E8A0BF': 'oklch(0.75 0.12 340)', // rose
    '#6B8E4E': 'oklch(0.55 0.12 140)', // forest
  }
  return colorMap[hex] || 'oklch(0.75 0.14 162)'
}

export const useSettingsStore = create<SettingsStore>()((set, get) => ({
  settings: null,
  isLoading: false,
  setSettings: (settings) => set({ settings }),
  setLoading: (isLoading) => set({ isLoading }),
  updateSettings: (updates) => {
    set((state) => ({
      settings: state.settings ? { ...state.settings, ...updates } : null,
    }))
    // Apply theme changes immediately
    get().applyTheme()
  },
  applyTheme: () => {
    const { settings } = get()
    const root = document.documentElement
    
    // Apply theme (light/dark/system)
    if (settings?.theme) {
      if (settings.theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        root.classList.toggle('dark', prefersDark)
      } else {
        root.classList.toggle('dark', settings.theme === 'dark')
      }
    }

    // Apply primary color
    const themeColor = get().getThemeColor(settings?.primaryColor)
    const primaryOklch = hexToOklch(themeColor.primary)
    
    // Set CSS variables for the theme
    root.style.setProperty('--primary', primaryOklch)
    root.style.setProperty('--ring', primaryOklch)
    
    // Apply font size
    if (settings?.fontSize) {
      const fontSizes = {
        small: '14px',
        medium: '16px',
        large: '18px',
      }
      root.style.setProperty('--font-size-base', fontSizes[settings.fontSize])
    }

    // Apply compact mode
    if (settings?.compactMode !== undefined) {
      root.classList.toggle('compact-mode', settings.compactMode)
    }
  },
  getThemeColor: (colorKey?: string) => {
    const key = colorKey || get().settings?.primaryColor || 'mint'
    return themeColors[key] || themeColors.mint
  },
}))

// Hook to apply theme on mount
export function useThemeEffect() {
  const { settings, applyTheme } = useSettingsStore()
  
  if (typeof window !== 'undefined' && settings) {
    applyTheme()
  }
}
