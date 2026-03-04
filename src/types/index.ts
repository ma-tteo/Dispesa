export interface User {
  id: string
  email: string
  name: string | null
  avatar: string | null
  createdAt: Date
  updatedAt: Date
}

export interface FamilyGroup {
  id: string
  name: string
  inviteCode: string
  ownerId: string
  createdAt: Date
  updatedAt: Date
  members?: FamilyMember[]
  lists?: List[]
}

export interface FamilyMember {
  id: string
  userId: string
  groupId: string
  joinedAt: Date
  user?: User
}

export interface List {
  id: string
  name: string
  icon: string | null
  color: string | null
  groupId: string
  createdById: string
  sortOrder: number
  createdAt: Date
  updatedAt: Date
  products?: Product[]
}

export interface Product {
  id: string
  name: string
  categoryId: string | null
  storeId: string | null
  price: number | null
  weight: string | null
  quantity: number
  imageUrl: string | null
  status: 'TO_BUY' | 'COMPLETED'
  notes: string | null
  listId: string
  createdById: string
  createdAt: Date
  updatedAt: Date
  category?: Category | null
  store?: Store | null
  createdBy?: User
}

export interface Category {
  id: string
  name: string
  icon: string | null
  color: string | null
}

export interface Store {
  id: string
  name: string
  icon: string | null
  color: string | null
}

export interface UserSettings {
  id: string
  userId: string
  theme: 'light' | 'dark' | 'system'
  primaryColor: string
  fontSize: 'small' | 'medium' | 'large'
  compactMode: boolean
  showPrices: boolean
  showImages: boolean
  defaultStoreId: string | null
  currency: string
  language: string
  notifications: boolean
}

export interface ThemeColor {
  name: string
  primary: string
  light: string
  dark: string
}

export const themeColors: Record<string, ThemeColor> = {
  mint: { name: 'Verde Menta', primary: '#98D8AA', light: '#E8F5E9', dark: '#2D5A3D' },
  coral: { name: 'Corallo', primary: '#FF6B6B', light: '#FFE5E5', dark: '#8B3A3A' },
  ocean: { name: 'Oceano', primary: '#4ECDC4', light: '#E0F7FA', dark: '#2A6B66' },
  lavender: { name: 'Lavanda', primary: '#9B8AA6', light: '#F3E5F5', dark: '#4A3F55' },
  sunset: { name: 'Tramonto', primary: '#F7B267', light: '#FFF3E0', dark: '#8B5E34' },
  sky: { name: 'Cielo', primary: '#7EB5D6', light: '#E3F2FD', dark: '#3D6073' },
  rose: { name: 'Rosa', primary: '#E8A0BF', light: '#FCE4EC', dark: '#6B4A5A' },
  forest: { name: 'Foresta', primary: '#6B8E4E', light: '#E8F5E9', dark: '#2D3B24' },
}

export interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  currentGroup: FamilyGroup | null
  currentList: List | null
  settings: UserSettings | null
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  setCurrentGroup: (group: FamilyGroup | null) => void
  setCurrentList: (list: List | null) => void
  setSettings: (settings: UserSettings | null) => void
  logout: () => void
}
