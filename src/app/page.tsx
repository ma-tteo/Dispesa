'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuthStore } from '@/store/auth'
import { useSettingsStore } from '@/store/settings'
import { usePusher } from '@/hooks/usePusher'
import { AnimatePresence, motion } from 'framer-motion'
import { 
  ShoppingCart, Plus, Search, Filter, Store, Tag, 
  LogOut, Users, UserPlus, Copy, Check, Trash2, 
  CheckCircle2, Circle, ChefHat, X, ChevronDown,
  Apple, Milk, Beef, Fish, Snowflake, Wheat, 
  Croissant, GlassWater, Cookie, Home, Bath, Package,
  Menu, Settings as SettingsIcon, User, ArrowLeft, Palette,
  Sun, Moon, Monitor, Type, Eye, EyeOff, Globe, Bell,
  List as ListIcon, Edit2, DollarSign, Heart, Info, Sparkles, Image as ImageIcon, Download, FileText, FileJson
} from 'lucide-react'
import { APP_VERSION, APP_NAME, APP_TAGLINE } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import type { User as UserType, FamilyGroup, Product, Category, Store as StoreType, List, UserSettings, ThemeColor } from '@/types'
import { themeColors } from '@/types'

// Icon mapping for categories (fallback if no icon in DB)
const categoryIconMap: Record<string, string> = {
  'Frutta e Verdura': '🥬',
  'Latticini e Uova': '🥛',
  'Carne': '🥩',
  'Pesce': '🐟',
  'Surgelati': '🧊',
  'Pasta e Riso': '🍝',
  'Pane e Cereali': '🍞',
  'Condimenti': '🫒',
  'Bevande': '🥤',
  'Dolci e Snack': '🍪',
  'Igiene Casa': '🧹',
  'Igiene Personale': '🧴',
  'Bebè': '🍼',
  'Animali': '🐕',
  'Altro': '📦',
}

// API helper with proper error handling
const api = async (url: string, options: RequestInit = {}, userId?: string) => {
  // Add trailing slash only for paths without query parameters to avoid 308 redirect
  const normalizedUrl = url.includes('?') ? url : (url.endsWith('/') ? url : `${url}/`)

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(userId && { 'x-user-id': userId }),
    ...options.headers,
  }

  let res: Response
  try {
    res = await fetch(normalizedUrl, { ...options, headers })
  } catch (networkError) {
    // Handle network errors (connection refused, timeout, etc.)
    console.error('Network error:', networkError)
    throw new Error('Impossibile connettersi al server. Riprova tra poco.')
  }

  // Try to parse JSON, but handle non-JSON responses gracefully
  let data: Record<string, unknown>
  try {
    data = await res.json()
  } catch {
    throw new Error(`Errore nella risposta del server (${res.status})`)
  }

  if (!res.ok) {
    throw new Error((data.error as string) || 'Errore del server')
  }

  return data
}

// Helper to convert hex to oklch
function hexToOklch(hex: string): string {
  const colorMap: Record<string, string> = {
    '#98D8AA': 'oklch(0.75 0.14 162)',
    '#FF6B6B': 'oklch(0.65 0.22 25)',
    '#4ECDC4': 'oklch(0.70 0.12 185)',
    '#9B8AA6': 'oklch(0.62 0.08 300)',
    '#F7B267': 'oklch(0.75 0.14 70)',
    '#7EB5D6': 'oklch(0.70 0.10 220)',
    '#E8A0BF': 'oklch(0.75 0.12 340)',
    '#6B8E4E': 'oklch(0.55 0.12 140)',
  }
  return colorMap[hex] || 'oklch(0.75 0.14 162)'
}

// Apply theme to document
function applyThemeToDocument(settings: UserSettings | null) {
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
  const themeColor = themeColors[settings?.primaryColor || 'mint']
  const primaryOklch = hexToOklch(themeColor.primary)
  
  root.style.setProperty('--primary', primaryOklch)
  root.style.setProperty('--ring', primaryOklch)
  
  // Apply font size
  if (settings?.fontSize) {
    const fontSizes = {
      small: '14px',
      medium: '16px',
      large: '18px',
    }
    root.style.fontSize = fontSizes[settings.fontSize]
  }

  // Apply compact mode
  root.classList.toggle('compact-mode', settings?.compactMode || false)
}

// Loading Screen Component - Performance optimized with CSS
function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-300">
        <div className="p-5 rounded-full bg-primary/10 animate-pulse">
          <ShoppingCart className="w-12 h-12 text-primary" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-1">{APP_NAME}</h1>
          <p className="text-sm text-muted-foreground">{APP_TAGLINE}</p>
        </div>
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  )
}

// Auth View Component
function AuthView({ onAuth }: { onAuth: (user: UserType) => void }) {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register'
      const body = isLogin ? { email, password } : { email, password, name }
      
      const { user } = await api(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      })

      onAuth(user)
      toast.success(isLogin ? 'Benvenuto!' : 'Registrazione completata!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Errore')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-muted/30 to-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="soft-shadow border-0">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                className="p-4 rounded-full bg-primary/10"
              >
                <ShoppingCart className="w-10 h-10 text-primary" />
              </motion.div>
            </div>
            <CardTitle className="text-2xl font-bold">
              {APP_NAME}
            </CardTitle>
            <CardDescription>
              {APP_TAGLINE}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={isLogin ? 'login' : 'register'} onValueChange={(v) => setIsLogin(v === 'login')}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Accedi</TabsTrigger>
                <TabsTrigger value="register">Registrati</TabsTrigger>
              </TabsList>

              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Il tuo nome"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@esempio.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="rounded-xl"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="rounded-xl"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full rounded-xl h-11" 
                  disabled={loading}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    isLogin ? 'Accedi' : 'Registrati'
                  )}
                </Button>
              </form>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

// Group Selection Component
function GroupSelection({ 
  user, 
  groups, 
  onSelectGroup, 
  onCreateGroup,
  onJoinGroup,
  onLogout,
  onOpenSettings
}: { 
  user: UserType
  groups: FamilyGroup[]
  onSelectGroup: (group: FamilyGroup) => void
  onCreateGroup: () => void
  onJoinGroup: (code: string) => void
  onLogout: () => void
  onOpenSettings: () => void
}) {
  const [showJoinDialog, setShowJoinDialog] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      toast.error('Inserisci un codice invito')
      return
    }
    
    setLoading(true)
    try {
      await onJoinGroup(inviteCode)
      setShowJoinDialog(false)
      setInviteCode('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Errore')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-muted/30 to-background">
      <header className="sticky top-0 z-50 glass border-b">
        <div className="container max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-6 h-6 text-primary" />
            <span className="font-semibold">{APP_NAME}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onOpenSettings}>
              <SettingsIcon className="w-4 h-4" />
            </Button>
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {user.name?.[0] || user.email?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="icon" onClick={onLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container max-w-2xl mx-auto p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="text-center py-6">
            <h1 className="text-2xl font-bold mb-2">Ciao, {user.name || 'Utente'}! 👋</h1>
            <p className="text-muted-foreground">Seleziona o crea un gruppo famiglia</p>
          </div>

          {groups.length > 0 ? (
            <div className="space-y-3">
              {groups.map((group) => (
                <Card 
                  key={group.id}
                  className="soft-shadow border-0 cursor-pointer hover:soft-shadow-hover transition-all duration-300"
                  onClick={() => onSelectGroup(group)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-primary/10">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{group.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {group.members?.length || 0} membri
                        </p>
                      </div>
                    </div>
                    <ChevronDown className="w-5 h-5 text-muted-foreground -rotate-90" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="soft-shadow border-0">
              <CardContent className="p-8 text-center">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Nessun gruppo</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Crea un nuovo gruppo o unisciti ad uno esistente
                </p>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1 rounded-xl h-12"
              onClick={() => setShowJoinDialog(true)}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Unisciti
            </Button>
            <Button 
              className="flex-1 rounded-xl h-12"
              onClick={onCreateGroup}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuovo Gruppo
            </Button>
          </div>
        </motion.div>
      </main>

      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent className="rounded-2xl" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Unisciti a un gruppo</DialogTitle>
            <DialogDescription>
              Inserisci il codice invito che hai ricevuto
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Codice invito (es. ABCD1234)"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              className="rounded-xl text-center text-lg tracking-widest uppercase"
              maxLength={8}
            />
            <Button 
              className="w-full rounded-xl" 
              onClick={handleJoin}
              disabled={loading}
            >
              {loading ? 'Unione in corso...' : 'Unisciti al gruppo'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Create Group Dialog
function CreateGroupDialog({ 
  open, 
  onOpenChange, 
  onCreate 
}: { 
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (name: string) => void
}) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Inserisci un nome per il gruppo')
      return
    }
    
    setLoading(true)
    try {
      await onCreate(name)
      setName('')
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Errore')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Crea un nuovo gruppo</DialogTitle>
          <DialogDescription>
            Dai un nome al tuo gruppo famiglia
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="es. Famiglia Rossi"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-xl"
          />
          <Button 
            className="w-full rounded-xl" 
            onClick={handleCreate}
            disabled={loading}
          >
            {loading ? 'Creazione...' : 'Crea gruppo'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Settings Dialog - Optimized
function SettingsDialog({
  open,
  onOpenChange,
  settings,
  onUpdateSettings,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: UserSettings | null
  onUpdateSettings: (updates: Partial<UserSettings>) => Promise<void>
}) {
  // Use settings directly as local state, with fallback defaults
  const getSetting = <K extends keyof UserSettings>(key: K, defaultValue: UserSettings[K]): UserSettings[K] => {
    return settings?.[key] ?? defaultValue
  }

  // Update setting with immediate save
  const updateSetting = useCallback(async (key: keyof UserSettings, value: string | boolean) => {
    try {
      await onUpdateSettings({ [key]: value })
    } catch {
      toast.error('Errore durante il salvataggio')
    }
  }, [onUpdateSettings])

  // Handle notifications toggle - request browser permission
  const handleNotificationsChange = useCallback(async (checked: boolean) => {
    if (checked) {
      // Request browser notification permission
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const permission = await Notification.requestPermission()
        
        if (permission === 'granted') {
          await updateSetting('notifications', true)
          toast.success('Notifiche attivate!')
        } else if (permission === 'denied') {
          toast.error('Permesso negato. Abilita le notifiche nelle impostazioni del browser.')
        } else {
          // User dismissed the prompt
          toast.info('Permetti le notifiche per ricevere aggiornamenti')
        }
      } else {
        toast.error('Il browser non supporta le notifiche')
      }
    } else {
      await updateSetting('notifications', false)
      toast.info('Notifiche disattivate')
    }
  }, [updateSetting])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="rounded-2xl max-w-[360px] max-h-[90vh] overflow-y-auto p-5"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="pb-3">
          <DialogTitle className="text-base font-medium">Impostazioni</DialogTitle>
          <DialogDescription className="sr-only">
            Personalizza le preferenze dell'applicazione
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Theme */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Tema</Label>
            <div className="grid grid-cols-3 gap-2">
              {(['light', 'dark', 'system'] as const).map((theme) => (
                <Button
                  key={theme}
                  variant={getSetting('theme', 'light') === theme ? 'default' : 'outline'}
                  size="sm"
                  className="rounded-lg text-xs h-9"
                  onClick={() => updateSetting('theme', theme)}
                >
                  {theme === 'light' ? 'Chiaro' : theme === 'dark' ? 'Scuro' : 'Sistema'}
                </Button>
              ))}
            </div>
          </div>

          {/* Primary Color */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Colore</Label>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(themeColors).map(([key, color]) => (
                <button
                  key={key}
                  className={`w-8 h-8 rounded-lg ${
                    getSetting('primaryColor', 'mint') === key ? 'ring-2 ring-offset-1 ring-primary' : ''
                  }`}
                  style={{ backgroundColor: color.primary }}
                  onClick={() => updateSetting('primaryColor', key)}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between py-1">
              <Label className="text-sm">Modalità Compatta</Label>
              <Switch
                checked={getSetting('compactMode', false)}
                onCheckedChange={(checked) => updateSetting('compactMode', checked)}
              />
            </div>
            <div className="flex items-center justify-between py-1">
              <Label className="text-sm">Mostra Prezzi</Label>
              <Switch
                checked={getSetting('showPrices', true)}
                onCheckedChange={(checked) => updateSetting('showPrices', checked)}
              />
            </div>
            <div className="flex items-center justify-between py-1">
              <Label className="text-sm">Mostra Immagini</Label>
              <Switch
                checked={getSetting('showImages', false)}
                onCheckedChange={(checked) => updateSetting('showImages', checked)}
              />
            </div>
            <div className="flex items-center justify-between py-1">
              <Label className="text-sm">Notifiche</Label>
              <Switch
                checked={getSetting('notifications', true)}
                onCheckedChange={handleNotificationsChange}
              />
            </div>
          </div>

          {/* Currency & Language */}
          <div className="grid grid-cols-2 gap-2">
            <Select value={getSetting('currency', 'EUR')} onValueChange={(v) => updateSetting('currency', v)}>
              <SelectTrigger className="rounded-lg h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EUR">€ EUR</SelectItem>
                <SelectItem value="USD">$ USD</SelectItem>
                <SelectItem value="GBP">£ GBP</SelectItem>
              </SelectContent>
            </Select>
            <Select value={getSetting('language', 'it')} onValueChange={(v) => updateSetting('language', v)}>
              <SelectTrigger className="rounded-lg h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="it">🇮🇹 IT</SelectItem>
                <SelectItem value="en">🇬🇧 EN</SelectItem>
                <SelectItem value="de">🇩🇪 DE</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* App Info */}
          <div className="pt-3 border-t text-center">
            <p className="text-sm font-medium">{APP_NAME}</p>
            <p className="text-xs text-muted-foreground">{APP_VERSION}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Product Card Component - Mobile Optimized (Performance optimized)
function ProductCard({
  product,
  onToggleStatus,
  onDelete,
  onEdit,
  showPrices = true,
  showImages = false,
  compactMode = false,
  currency = 'EUR'
}: {
  product: Product
  onToggleStatus: () => void
  onDelete: () => void
  onEdit: () => void
  showPrices?: boolean
  showImages?: boolean
  compactMode?: boolean
  currency?: string
}) {
  const [swipeX, setSwipeX] = useState(0)
  const startXRef = useRef(0)
  const isDraggingRef = useRef(false)
  const hasMovedRef = useRef(false)

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX
    isDraggingRef.current = true
    hasMovedRef.current = false
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return
    const diff = e.touches[0].clientX - startXRef.current
    if (Math.abs(diff) > 5) {
      hasMovedRef.current = true
    }
    const maxSwipe = 80
    const swipe = Math.abs(diff) > maxSwipe ? Math.sign(diff) * maxSwipe : diff
    setSwipeX(swipe)
  }

  const handleTouchEnd = () => {
    isDraggingRef.current = false

    if (swipeX > 50) {
      onToggleStatus()
    } else if (swipeX < -50) {
      onDelete()
    } else if (!hasMovedRef.current) {
      // It was a tap, not a swipe - open edit dialog
      onEdit()
    }

    setSwipeX(0)
  }

  const handleToggleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onToggleStatus()
  }

  // Stop touch propagation on toggle button
  const handleToggleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation()
  }

  const handleToggleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onToggleStatus()
  }

  const isCompleted = product.status === 'COMPLETED'
  const currencySymbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency === 'GBP' ? '£' : currency

  const showRightAction = swipeX > 20
  const showLeftAction = swipeX < -20

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Swipe action backgrounds */}
      <div className="absolute inset-0 flex pointer-events-none">
        <div 
          className={`flex-1 flex items-center pl-4 bg-gradient-to-r from-green-400 to-green-500 transition-opacity duration-150 ${showRightAction ? 'opacity-100' : 'opacity-0'}`}
        >
          <CheckCircle2 className="w-5 h-5 text-white" />
        </div>
        <div 
          className={`flex-1 flex items-center justify-end pr-4 bg-gradient-to-l from-red-400 to-red-500 transition-opacity duration-150 ${showLeftAction ? 'opacity-100' : 'opacity-0'}`}
        >
          <Trash2 className="w-5 h-5 text-white" />
        </div>
      </div>

      {/* Main card - using CSS transform for performance */}
      <div
        style={{
          transform: `translateX(${swipeX}px)`,
          transition: swipeX === 0 ? 'transform 0.2s ease-out' : 'none'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="touch-manipulation cursor-pointer"
      >
        {compactMode ? (
          // COMPACT MODE: Only name and toggle
          <div
            className={`flex items-center gap-2 px-2 py-1 ${
              isCompleted ? 'opacity-60 bg-muted/30' : 'bg-card'
            } rounded-xl`}
          >
            {/* Toggle button - larger hitbox */}
            <button
              onClick={handleToggleClick}
              onTouchEnd={handleToggleTouchEnd}
              className="p-3 -m-2 touch-manipulation flex-shrink-0 active:scale-90 transition-transform z-10"
            >
              {isCompleted ? (
                <CheckCircle2 className="w-6 h-6 text-primary" />
              ) : (
                <Circle className="w-6 h-6 text-muted-foreground/40" />
              )}
            </button>

            {/* Product name only */}
            <span className={`flex-1 min-w-0 truncate text-sm ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
              {product.name}
            </span>
          </div>
        ) : (
          // NORMAL MODE: All details
          <div
            className={`flex items-center gap-3 px-3 py-2.5 ${
              isCompleted ? 'opacity-60 bg-muted/30' : 'bg-card'
            } rounded-xl`}
          >
            {/* Product Image */}
            {showImages && product.imageUrl ? (
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : showImages ? (
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <ImageIcon className="w-5 h-5 text-muted-foreground/40" />
              </div>
            ) : null}

            {/* Toggle button */}
            <button
              onClick={handleToggleClick}
              onTouchEnd={handleToggleTouchEnd}
              className="p-3 -m-2 touch-manipulation flex-shrink-0 active:scale-90 transition-transform z-10"
            >
              {isCompleted ? (
                <CheckCircle2 className="w-6 h-6 text-primary" />
              ) : (
                <Circle className="w-6 h-6 text-muted-foreground/40" />
              )}
            </button>

            {/* Product details */}
            <div className="flex-1 min-w-0">
              <span className={`block truncate font-medium ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                {product.name}
              </span>
              
              {/* Weight and notes */}
              {(product.weight || product.notes) && (
                <p className="text-xs text-muted-foreground truncate">
                  {product.weight}
                  {product.weight && product.notes && ' • '}
                  {product.notes}
                </p>
              )}
            </div>

            {/* Category */}
            {product.category && (
              <span className="text-lg flex-shrink-0" title={product.category.name}>
                {product.category.icon || '📦'}
              </span>
            )}

            {/* Quantity */}
            {product.quantity > 1 && (
              <span className="text-sm text-muted-foreground flex-shrink-0">×{product.quantity}</span>
            )}

            {/* Price */}
            {showPrices && product.price && (
              <span className="text-sm font-semibold text-primary flex-shrink-0">
                {currencySymbol}{(product.price * product.quantity).toFixed(2)}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Add/Edit Product Dialog - Compact
function ProductDialog({
  open,
  onOpenChange,
  product,
  categories,
  lists,
  currentListId,
  userId,
  onSave,
  onCreateCategory,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: Product | null
  categories: Category[]
  lists: List[]
  currentListId: string
  userId: string
  onSave: (product: Product) => void
  onCreateCategory?: () => void
}) {
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [selectedListId, setSelectedListId] = useState('')
  const [price, setPrice] = useState('')
  const [weight, setWeight] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [imageUrl, setImageUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Initialize form when product changes or dialog opens
  useEffect(() => {
    if (open) {
      if (product) {
        setName(product.name)
        setCategoryId(product.categoryId || null)
        setSelectedListId(product.listId || currentListId)
        setPrice(product.price?.toString() || '')
        setWeight(product.weight || '')
        setQuantity(product.quantity?.toString() || '1')
        // Preserve the imageUrl - critical fix
        setImageUrl(product.imageUrl || '')
        setNotes(product.notes || '')
      } else {
        setName('')
        setCategoryId(null)
        setSelectedListId(currentListId)
        setPrice('')
        setWeight('')
        setQuantity('1')
        setImageUrl('')
        setNotes('')
      }
    }
  }, [product, open, currentListId])

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Seleziona un\'immagine valida')
      return
    }
    // Must match backend MAX_FILE_SIZE (2MB)
    const MAX_FILE_SIZE = 2 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      toast.error('L\'immagine deve essere inferiore a 2MB')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        headers: userId ? { 'x-user-id': userId } : {},
      })
      const data = await res.json()
      if (data.imageUrl) {
        setImageUrl(data.imageUrl)
        toast.success('Immagine caricata!')
      }
    } catch {
      toast.error('Errore durante il caricamento')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Inserisci il nome del prodotto')
      return
    }

    setLoading(true)
    try {
      if (product) {
        const { product: updated } = await api(`/api/products/${product.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name,
            categoryId,
            listId: selectedListId || currentListId,
            price: price || null,
            weight: weight || null,
            quantity,
            imageUrl: imageUrl || null,
            notes: notes || null,
          }),
        }, userId)
        onSave(updated)
      } else {
        const { product: newProduct } = await api('/api/products', {
          method: 'POST',
          body: JSON.stringify({
            name,
            categoryId,
            listId: selectedListId || currentListId,
            price: price || null,
            weight: weight || null,
            quantity,
            imageUrl: imageUrl || null,
            notes: notes || null,
          }),
        }, userId)
        onSave(newProduct)
      }
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Errore')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="rounded-2xl max-w-[360px] max-h-[90vh] overflow-y-auto p-4"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="pb-2 sr-only">
          <DialogTitle className="text-sm font-medium">
            {product ? 'Modifica Prodotto' : 'Nuovo Prodotto'}
          </DialogTitle>
          <DialogDescription>
            {product ? 'Modifica i dettagli del prodotto' : 'Aggiungi un nuovo prodotto alla lista'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3">
          {/* Name input */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nome *</Label>
            <Input
              placeholder="es. Latte intero"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 rounded-lg text-sm"
            />
          </div>

          {/* Category and List row */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Categoria</Label>
                {onCreateCategory && (
                  <button
                    type="button"
                    onClick={onCreateCategory}
                    className="text-[10px] text-primary hover:underline"
                  >
                    +Nuova
                  </button>
                )}
              </div>
              <Select value={categoryId || "none"} onValueChange={(v) => setCategoryId(v === "none" ? null : v)}>
                <SelectTrigger className="h-10 rounded-lg text-xs">
                  <SelectValue placeholder="Nessuna" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nessuna</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span className="flex items-center gap-1 text-xs">
                        <span>{cat.icon || '📦'}</span>
                        <span>{cat.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-0.5">
              <Label className="text-[10px] text-muted-foreground">Lista</Label>
              <Select value={selectedListId || currentListId} onValueChange={setSelectedListId}>
                <SelectTrigger className="h-9 rounded-lg text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {lists.map((list) => {
                    const listColor = themeColors[list.color || 'mint']
                    return (
                      <SelectItem key={list.id} value={list.id}>
                        <span className="flex items-center gap-1 text-xs">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: listColor.primary }} />
                          {list.name}
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quantity, Price, Weight row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-0.5">
              <Label className="text-[10px] text-muted-foreground">Q.tà</Label>
              <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="h-9 rounded-lg text-center text-xs" />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px] text-muted-foreground">Prezzo €</Label>
              <Input type="number" step="0.01" placeholder="0" value={price} onChange={(e) => setPrice(e.target.value)} className="h-9 rounded-lg text-xs" />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px] text-muted-foreground">Peso</Label>
              <Input placeholder="1L" value={weight} onChange={(e) => setWeight(e.target.value)} className="h-9 rounded-lg text-xs" />
            </div>
          </div>

          {/* Image Upload - Compact */}
          <div className="space-y-0.5">
            <Label className="text-[10px] text-muted-foreground">Immagine</Label>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            {imageUrl ? (
              <div className="relative h-12 rounded-lg overflow-hidden bg-muted">
                <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                <button type="button" onClick={() => setImageUrl('')} className="absolute top-0.5 right-0.5 p-0.5 bg-black/50 rounded-full text-white">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} 
                className="w-full h-9 rounded-lg border border-dashed border-muted-foreground/30 hover:border-primary flex items-center justify-center gap-1 text-muted-foreground text-xs">
                {uploading ? (
                  <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Plus className="w-3 h-3" />
                    <span>Aggiungi immagine</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" className="flex-1 h-9 rounded-lg text-xs" onClick={() => onOpenChange(false)}>Annulla</Button>
            <Button size="sm" className="flex-1 h-9 rounded-lg text-xs" onClick={handleSave} disabled={loading}>
              {loading ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (product ? 'Salva' : 'Aggiungi')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Create List Dialog
function CreateListDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (name: string, color?: string) => void
}) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('mint')
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Inserisci un nome per la lista')
      return
    }
    
    setLoading(true)
    try {
      await onCreate(name, color)
      setName('')
      setColor('mint')
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Errore')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Nuova Lista</DialogTitle>
          <DialogDescription>
            Crea una nuova lista della spesa
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome lista</Label>
            <Input
              placeholder="es. Lista Conad"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label>Colore</Label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(themeColors).map(([key, c]) => (
                <button
                  key={key}
                  className={`w-full aspect-square rounded-xl transition-all ${
                    color === key 
                      ? 'ring-2 ring-offset-2 ring-primary scale-105' 
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c.primary }}
                  onClick={() => setColor(key)}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          <Button 
            className="w-full rounded-xl" 
            onClick={handleCreate}
            disabled={loading}
          >
            {loading ? 'Creazione...' : 'Crea lista'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Create Category Dialog - Compact
function CategoryDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (name: string, icon: string, color: string) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('📦')
  const [color, setColor] = useState('#64748b')
  const [loading, setLoading] = useState(false)

  const emojiOptions = ['📦', '🥬', '🥛', '🥩', '🐟', '🍝', '🍞', '🫒', '🥤', '🍪', '🧊', '🧹', '🧴', '🍼', '🐕', '🧀', '🥚', '🥔', '🍅', '🥕', '🍎', '🍊', '🍌', '🍇', '🍷', '☕', '🧁', '🍫', '🧻', '💊']
  const colorOptions = ['#22c55e', '#3b82f6', '#ef4444', '#06b6d4', '#f59e0b', '#d97706', '#84cc16', '#8b5cf6', '#ec4899', '#0ea5e9', '#14b8a6', '#f472b6', '#fb923c', '#a78bfa', '#64748b']

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Inserisci il nome della categoria')
      return
    }

    setLoading(true)
    try {
      await onCreate(name, icon, color)
      setName('')
      setIcon('📦')
      setColor('#64748b')
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Errore')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-[300px] p-3">
        <DialogHeader className="pb-1 sr-only">
          <DialogTitle className="text-sm">Nuova Categoria</DialogTitle>
          <DialogDescription className="sr-only">
            Crea una nuova categoria per organizzare i prodotti
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <div className="space-y-0.5">
            <Label className="text-[10px] text-muted-foreground">Nome</Label>
            <Input placeholder="es. Snack" value={name} onChange={(e) => setName(e.target.value)} className="h-8 rounded-lg text-xs" />
          </div>

          <div className="space-y-0.5">
            <Label className="text-[10px] text-muted-foreground">Icona</Label>
            <div className="flex flex-wrap gap-1">
              {emojiOptions.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setIcon(e)}
                  className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center ${icon === e ? 'bg-primary/20 ring-1 ring-primary' : 'bg-muted hover:bg-muted/80'}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-0.5">
            <Label className="text-[10px] text-muted-foreground">Colore</Label>
            <div className="flex flex-wrap gap-1">
              {colorOptions.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-lg ${color === c ? 'ring-1 ring-offset-1 ring-primary' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" className="flex-1 h-8 rounded-lg text-xs" onClick={() => onOpenChange(false)}>Annulla</Button>
            <Button size="sm" className="flex-1 h-8 rounded-lg text-xs" onClick={handleCreate} disabled={loading}>
              {loading ? '...' : 'Crea'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Group Info Drawer
function GroupInfoDrawer({
  group,
  lists,
  products,
  onLeave,
  onOpenSettings,
  onExport,
}: {
  group: FamilyGroup
  lists: List[]
  products: Product[]
  onLeave: () => void
  onOpenSettings: () => void
  onExport: (format: 'json' | 'txt') => void
}) {
  const [copied, setCopied] = useState(false)

  const copyInviteCode = () => {
    navigator.clipboard.writeText(group.inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Codice copiato!')
  }

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="ghost" size="icon">
          <SettingsIcon className="w-5 h-5" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="rounded-t-3xl">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {group.name}
          </DrawerTitle>
        </DrawerHeader>
        <div className="p-4 space-y-6">
          {/* Invite Code */}
          <Card className="soft-shadow border-0 bg-primary/5">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-2">Codice Invito</p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-mono font-bold tracking-widest">
                  {group.inviteCode}
                </span>
                <Button variant="ghost" size="icon" onClick={copyInviteCode}>
                  {copied ? (
                    <Check className="w-5 h-5 text-primary" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Condividi questo codice per invitare familiari
              </p>
            </CardContent>
          </Card>

          {/* Members */}
          <div>
            <h4 className="font-semibold mb-3">Membri ({group.members?.length || 0}/10)</h4>
            <div className="space-y-2">
              {group.members?.map((member) => (
                <div key={member.id} className="flex items-center gap-3 p-2 rounded-xl bg-muted/50">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {member.user?.name?.[0] || member.user?.email[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {member.user?.name || 'Utente'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {member.user?.email}
                    </p>
                  </div>
                  {group.ownerId === member.userId && (
                    <Badge variant="secondary" className="text-xs">
                      Proprietario
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Export Buttons */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Esporta liste</p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                className="flex-1 rounded-lg"
                onClick={() => onExport('json')}
              >
                <FileJson className="w-4 h-4 mr-1" />
                JSON
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="flex-1 rounded-lg"
                onClick={() => onExport('txt')}
              >
                <FileText className="w-4 h-4 mr-1" />
                TXT
              </Button>
            </div>
          </div>

          {/* Settings Button */}
          <Button 
            variant="outline" 
            className="w-full rounded-xl"
            onClick={onOpenSettings}
          >
            <SettingsIcon className="w-4 h-4 mr-2" />
            Impostazioni App
          </Button>

          <Button 
            variant="destructive" 
            className="w-full rounded-xl"
            onClick={onLeave}
          >
            {group.ownerId === group.members?.find(m => m.userId === group.ownerId)?.userId
              ? 'Elimina gruppo'
              : 'Esci dal gruppo'}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

// Main Dashboard Component
function Dashboard({
  user,
  group,
  onLeaveGroup,
  onLogout,
  onOpenSettings,
  settings,
  onReady,
}: {
  user: UserType
  group: FamilyGroup
  onLeaveGroup: () => void
  onLogout: () => void
  onOpenSettings: () => void
  settings: UserSettings | null
  onReady?: () => void
}) {
  const [products, setProducts] = useState<Product[]>([])
  const [lists, setLists] = useState<List[]>([])
  const [currentList, setCurrentList] = useState<List | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'TO_BUY' | 'COMPLETED'>('all')
  const [showProductDialog, setShowProductDialog] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [showCreateList, setShowCreateList] = useState(false)
  const [showCategoryDialog, setShowCategoryDialog] = useState(false)
  const [suggestions, setSuggestions] = useState<Product[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const listTabsRef = useRef<HTMLDivElement>(null)
  const initialLoadDone = useRef(false)

  // Handle product changes from Pusher (real-time notifications)
  const handleProductChange = useCallback((data: { action: 'create' | 'update' | 'delete'; productId?: string; productName?: string; userId?: string }) => {
    fetchProducts()
    // Show notification if it's from another user
    if (data.userId && data.userId !== user.id && settings?.notifications) {
      if (data.action === 'create') {
        toast.info(`🛒 ${data.productName || 'Nuovo prodotto'} aggiunto alla lista`)
      } else if (data.action === 'update') {
        toast.info(`✏️ ${data.productName || 'Prodotto'} aggiornato`)
      } else if (data.action === 'delete') {
        toast.info(`🗑️ ${data.productName || 'Prodotto'} rimosso dalla lista`)
      }
    }
  }, [user.id, settings?.notifications])

  // Connect to Pusher for real-time updates
  usePusher(group.id, handleProductChange, user.id, settings?.notifications)

  // Generate product suggestions based on search
  useEffect(() => {
    if (search.length >= 2) {
      const allProducts = products.filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase())
      )
      setSuggestions(allProducts.slice(0, 5))
      setShowSuggestions(true)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }, [search, products])

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch lists
  const fetchLists = useCallback(async () => {
    try {
      const { lists: fetchedLists } = await api(`/api/lists?groupId=${group.id}`, {}, user.id)
      setLists(fetchedLists)
      
      // Set current list if not set
      setCurrentList(prev => {
        if (!prev && fetchedLists.length > 0) {
          return fetchedLists[0]
        }
        // Update current list data
        const updated = fetchedLists.find((l: List) => l.id === prev?.id)
        if (updated) {
          return updated
        } else if (fetchedLists.length > 0) {
          return fetchedLists[0]
        }
        return null
      })
    } catch (error) {
      console.error('Error fetching lists:', error)
    }
  }, [group.id, user.id])

  // Fetch products
  const fetchProducts = useCallback(async () => {
    if (!currentList) {
      setProducts([])
      setLoading(false)
      return
    }
    
    try {
      const params = new URLSearchParams({ listId: currentList.id })
      if (filterStatus !== 'all') params.append('status', filterStatus)
      if (filterCategory) params.append('category', filterCategory)
      if (search) params.append('search', search)

      const { products: fetchedProducts } = await api(`/api/products?${params}`, {}, user.id)
      setProducts(fetchedProducts)
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }, [currentList, user.id, filterStatus, filterCategory, search])

  // Initial data load - fetch everything at once
  useEffect(() => {
    if (initialLoadDone.current) return
    initialLoadDone.current = true

    const loadInitialData = async () => {
      try {
        // Fetch lists and categories in parallel
        const [listsRes, categoriesRes] = await Promise.all([
          api(`/api/lists?groupId=${group.id}`, {}, user.id),
          api('/api/categories/', {}, user.id)
        ])

        setLists(listsRes.lists)
        setCategories(categoriesRes.categories)

        // Set current list and fetch products
        if (listsRes.lists.length > 0) {
          const firstList = listsRes.lists[0]
          setCurrentList(firstList)

          // Now fetch products for this list
          const { products: fetchedProducts } = await api(
            `/api/products?listId=${firstList.id}`,
            {},
            user.id
          )
          setProducts(fetchedProducts)
        }
      } catch (error) {
        console.error('Error loading initial data:', error)
      } finally {
        setLoading(false)
        onReady?.()
      }
    }

    loadInitialData()
  }, [group.id, user.id, onReady])

  // Fetch lists when needed (after creation)
  useEffect(() => {
    fetchLists()
  }, [fetchLists])

  // Fetch products when filters change (not on initial load)
  useEffect(() => {
    if (!initialLoadDone.current) return
    fetchProducts()
  }, [fetchProducts])

  const handleToggleStatus = async (product: Product) => {
    try {
      const newStatus = product.status === 'TO_BUY' ? 'COMPLETED' : 'TO_BUY'
      await api(`/api/products/${product.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      }, user.id)
      fetchProducts()
    } catch (error) {
      toast.error('Errore durante l\'aggiornamento')
    }
  }

  const handleDelete = async (product: Product) => {
    try {
      await api(`/api/products/${product.id}`, { method: 'DELETE' }, user.id)
      fetchProducts()
      toast.success('Prodotto eliminato')
    } catch (error) {
      toast.error('Errore durante l\'eliminazione')
    }
  }

  const handleSaveProduct = (product: Product) => {
    fetchProducts()
    fetchLists()
    toast.success(editingProduct ? 'Prodotto aggiornato' : 'Prodotto aggiunto')
  }

  const handleCreateList = async (name: string, color?: string) => {
    const { list } = await api('/api/lists', {
      method: 'POST',
      body: JSON.stringify({ name, color, groupId: group.id }),
    }, user.id)
    setLists([...lists, list])
    setCurrentList(list)
    toast.success('Lista creata!')
  }

  const handleCreateCategory = async (name: string, icon: string, color: string) => {
    const { category } = await api('/api/categories', {
      method: 'POST',
      body: JSON.stringify({ name, icon, color }),
    }, user.id)
    setCategories([...categories, category])
    toast.success('Categoria creata!')
  }

  const handleDeleteList = async (listId: string) => {
    if (lists.length <= 1) {
      toast.error('Non puoi eliminare l\'unica lista')
      return
    }
    
    try {
      await api(`/api/lists/${listId}`, { method: 'DELETE' }, user.id)
      const updatedLists = lists.filter(l => l.id !== listId)
      setLists(updatedLists)
      if (currentList?.id === listId) {
        setCurrentList(updatedLists[0] || null)
      }
      toast.success('Lista eliminata')
    } catch (error) {
      toast.error('Errore durante l\'eliminazione')
    }
  }

  const total = products
    .filter(p => p.status === 'TO_BUY')
    .reduce((sum, p) => sum + (p.price || 0) * p.quantity, 0)

  const toBuyCount = products.filter(p => p.status === 'TO_BUY').length
  const completedCount = products.filter(p => p.status === 'COMPLETED').length

  const currency = settings?.currency || 'EUR'
  const currencySymbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency === 'GBP' ? '£' : currency

  // Export function
  const handleExport = (format: 'json' | 'txt') => {
    const data = {
      group: { name: group.name, inviteCode: group.inviteCode },
      lists: lists.map(list => ({
        name: list.name,
        products: products.filter(p => p.listId === list.id).map(p => ({
          name: p.name,
          category: p.category?.name,
          quantity: p.quantity,
          price: p.price,
          weight: p.weight,
          status: p.status,
          notes: p.notes
        }))
      })),
      exportedAt: new Date().toISOString()
    }

    let content: string
    let filename: string
    let mimeType: string

    if (format === 'json') {
      content = JSON.stringify(data, null, 2)
      filename = `dispensa-${group.name.toLowerCase().replace(/\s+/g, '-')}.json`
      mimeType = 'application/json'
    } else {
      content = `# ${group.name}\n\n`
      lists.forEach(list => {
        content += `## ${list.name}\n`
        const listProducts = products.filter(p => p.listId === list.id)
        if (listProducts.length === 0) {
          content += 'Nessun prodotto\n'
        } else {
          listProducts.forEach(p => {
            const status = p.status === 'COMPLETED' ? '✓' : '○'
            content += `- ${status} ${p.name}`
            if (p.quantity > 1) content += ` (x${p.quantity})`
            if (p.price) content += ` - ${currencySymbol}${p.price.toFixed(2)}`
            if (p.weight) content += ` [${p.weight}]`
            content += '\n'
          })
        }
        content += '\n'
      })
      filename = `dispensa-${group.name.toLowerCase().replace(/\s+/g, '-')}.txt`
      mimeType = 'text/plain'
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Lista esportata come ${format.toUpperCase()}`)
  }

  // Don't render anything while loading - let the App show LoadingScreen
  if (loading) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b">
        <div className="container max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => {
                  useAuthStore.getState().setCurrentGroup(null)
                }}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="font-semibold">{group.name}</h1>
                <p className="text-xs text-muted-foreground">
                  {toBuyCount} da comprare • {completedCount} completati
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <GroupInfoDrawer 
                group={group} 
                lists={lists}
                products={products}
                onLeave={onLeaveGroup} 
                onOpenSettings={onOpenSettings}
                onExport={handleExport}
              />
            </div>
          </div>
        </div>
      </header>

      {/* List Tabs */}
      <div className="sticky top-[60px] z-40 glass border-b">
        <div className="container max-w-2xl mx-auto">
          <ScrollArea className="w-full">
            <div 
              ref={listTabsRef}
              className="flex gap-2 p-3 overflow-x-auto"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {lists.map((list) => {
                const listColor = themeColors[list.color || 'mint']
                const isActive = currentList?.id === list.id
                
                return (
                  <motion.button
                    key={list.id}
                    whileTap={{ scale: 0.95 }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
                      isActive 
                        ? 'text-primary-foreground soft-shadow' 
                        : 'bg-muted/50 hover:bg-muted'
                    }`}
                    style={isActive ? { backgroundColor: listColor.primary } : {}}
                    onClick={() => setCurrentList(list)}
                  >
                    <span className="font-medium text-sm">{list.name}</span>
                    {list._count && (
                      <Badge 
                        variant={isActive ? 'secondary' : 'outline'}
                        className={`text-xs ${isActive ? 'bg-white/20 text-white border-0' : ''}`}
                      >
                        {list._count.products}
                      </Badge>
                    )}
                  </motion.button>
                )
              })}
              
              {/* Add List Button */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1 px-4 py-2 rounded-xl whitespace-nowrap bg-muted/50 hover:bg-muted transition-all text-muted-foreground"
                onClick={() => setShowCreateList(true)}
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">Nuova</span>
              </motion.button>
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="sticky top-[116px] z-30 glass border-b">
        <div className="container max-w-2xl mx-auto px-4 py-3 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1" ref={searchRef}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
              <Input
                placeholder="Cerca prodotti..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => search.length >= 2 && setShowSuggestions(true)}
                className="pl-10 rounded-xl"
              />
              {/* Autocomplete suggestions */}
              <AnimatePresence>
                {showSuggestions && suggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-xl shadow-lg overflow-hidden z-50"
                  >
                    {suggestions.map((product) => (
                      <button
                        key={product.id}
                        className="w-full px-4 py-3 text-left hover:bg-muted flex items-center gap-3 border-b last:border-0"
                        onClick={() => {
                          setSearch(product.name)
                          setShowSuggestions(false)
                        }}
                      >
                        <span className="text-lg">{product.category?.icon || '📦'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {product.category?.name || 'Senza categoria'}
                            {product.price && ` • €${product.price.toFixed(2)}`}
                          </p>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <Button
              variant={showFilters ? 'default' : 'outline'}
              size="icon"
              className="rounded-xl"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4" />
            </Button>
          </div>

          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="grid grid-cols-3 gap-2"
            >
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Stato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  <SelectItem value="TO_BUY">Da comprare</SelectItem>
                  <SelectItem value="COMPLETED">Completati</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tutte</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </motion.div>
          )}
        </div>
      </div>

      {/* Product List */}
      <main className="flex-1 container max-w-2xl mx-auto p-4 pb-32">
        {!currentList ? (
          <div className="text-center py-12">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <ListIcon className="w-20 h-20 mx-auto text-muted-foreground/50 mb-4" />
            </motion.div>
            <h3 className="font-semibold text-lg mb-2">Nessuna lista</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Crea una lista per iniziare
            </p>
            <Button 
              size="lg"
              className="rounded-full px-6"
              onClick={() => setShowCreateList(true)}
            >
              <Plus className="w-5 h-5 mr-2" />
              Crea Lista
            </Button>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <div
              className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin"
            />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="animate-in zoom-in duration-300">
              <ChefHat className="w-24 h-24 mx-auto text-muted-foreground/30 mb-6" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Lista vuota</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Tocca il pulsante + per aggiungere
            </p>
            <p className="text-xs text-muted-foreground/70">
              alla lista "{currentList.name}"
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onToggleStatus={() => handleToggleStatus(product)}
                onDelete={() => handleDelete(product)}
                onEdit={() => {
                  setEditingProduct(product)
                  setShowProductDialog(true)
                }}
                showPrices={settings?.showPrices ?? true}
                showImages={settings?.showImages ?? false}
                compactMode={settings?.compactMode ?? false}
                currency={currency}
              />
            ))}
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      {currentList && !loading && lists.length > 0 && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className="fixed bottom-24 right-4 z-50"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setEditingProduct(null)
              setShowProductDialog(true)
            }}
            className="w-16 h-16 rounded-full bg-primary text-primary-foreground soft-shadow-lg flex items-center justify-center fab-enter"
            style={{ boxShadow: '0 4px 20px oklch(0.75 0.14 162 / 0.4)' }}
          >
            <Plus className="w-7 h-7" />
          </motion.button>
        </motion.div>
      )}

      {/* Bottom Bar - Total */}
      <footer className="fixed bottom-0 left-0 right-0 glass border-t safe-bottom z-40">
        <div className="container max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Totale</p>
                  <p className="text-xl font-bold text-primary">
                    {currencySymbol}{total.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Quick stats */}
            <div className="flex items-center gap-3">
              <div className="text-center px-3 py-1 rounded-xl bg-muted/50">
                <p className="text-lg font-semibold">{toBuyCount}</p>
                <p className="text-[10px] text-muted-foreground">da comprare</p>
              </div>
              <div className="text-center px-3 py-1 rounded-xl bg-green-500/10">
                <p className="text-lg font-semibold text-green-600">{completedCount}</p>
                <p className="text-[10px] text-muted-foreground">completati</p>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Product Dialog */}
      <ProductDialog
        open={showProductDialog}
        onOpenChange={setShowProductDialog}
        product={editingProduct}
        categories={categories}
        lists={lists}
        currentListId={currentList?.id || ''}
        userId={user.id}
        onSave={handleSaveProduct}
        onCreateCategory={() => setShowCategoryDialog(true)}
      />

      {/* Create List Dialog */}
      <CreateListDialog
        open={showCreateList}
        onOpenChange={setShowCreateList}
        onCreate={handleCreateList}
      />

      <CategoryDialog
        open={showCategoryDialog}
        onOpenChange={setShowCategoryDialog}
        onCreate={handleCreateCategory}
      />
    </div>
  )
}

// Main App Component
export default function App() {
  const {
    user,
    isAuthenticated,
    isLoading,
    setUser,
    setLoading,
    currentGroup,
    setCurrentGroup,
    currentList,
    setCurrentList,
    settings,
    setSettings,
    logout
  } = useAuthStore()

  const { setSettings: setSettingsStore } = useSettingsStore()

  const [groups, setGroups] = useState<FamilyGroup[]>([])
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isFetchingData, setIsFetchingData] = useState(false)
  const [dashboardReady, setDashboardReady] = useState(false)

  // Reset dashboard ready when group changes
  useEffect(() => {
    setDashboardReady(false)
  }, [currentGroup?.id])

  // Apply theme when settings change
  useEffect(() => {
    if (settings) {
      applyThemeToDocument(settings)
    }
  }, [settings])

  // Check for hydration
  const _hasHydrated = useAuthStore((state) => state._hasHydrated)

  // Show loading until hydrated
  useEffect(() => {
    // If hydration is taking too long, force loading to false
    const timer = setTimeout(() => {
      if (isLoading) {
        setLoading(false)
      }
    }, 1000)
    return () => clearTimeout(timer)
  }, [isLoading, setLoading])

  // Track if we've loaded data for the current user
  const loadedUserIdRef = useRef<string | null>(null)

  // Fetch groups and settings when authenticated
  useEffect(() => {
    if (user) {
      // Only fetch if we haven't loaded data for this user yet
      if (loadedUserIdRef.current === user.id) return
      loadedUserIdRef.current = user.id

      const fetchData = async () => {
        setIsFetchingData(true)
        try {
          const [groupsRes, settingsRes] = await Promise.all([
            api('/api/groups/', {}, user.id),
            api('/api/settings/', {}, user.id)
          ])
          setGroups(groupsRes.groups)
          if (settingsRes.settings) {
            setSettings(settingsRes.settings)
            setSettingsStore(settingsRes.settings)
          }
        } catch (error) {
          console.error('Error fetching data:', error)
          // If unauthorized, clear the session
          if (error instanceof Error && error.message.includes('autorizzato')) {
            logout()
          }
        } finally {
          setIsFetchingData(false)
        }
      }
      fetchData()
    }
  }, [user, setSettings, setSettingsStore, logout])

  // Reset loaded state when user logs out
  useEffect(() => {
    if (!user) {
      loadedUserIdRef.current = null
    }
  }, [user])

  const handleCreateGroup = async (name: string) => {
    const { group } = await api('/api/groups', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }, user!.id)
    setGroups([...groups, group])
    setCurrentGroup(group)
    toast.success('Gruppo creato!')
  }

  const handleJoinGroup = async (inviteCode: string) => {
    const { group } = await api('/api/groups/join', {
      method: 'POST',
      body: JSON.stringify({ inviteCode }),
    }, user!.id)
    setGroups([...groups, group])
    setCurrentGroup(group)
    toast.success('Ti sei unito al gruppo!')
  }

  const handleLeaveGroup = async () => {
    if (!currentGroup) return
    
    try {
      await api('/api/groups/leave', {
        method: 'POST',
        body: JSON.stringify({ groupId: currentGroup.id }),
      }, user!.id)
      setGroups(groups.filter(g => g.id !== currentGroup.id))
      setCurrentGroup(null)
      toast.success('Hai lasciato il gruppo')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Errore')
    }
  }

  const handleUpdateSettings = async (updates: Partial<UserSettings>) => {
    const { settings: newSettings } = await api('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(updates),
    }, user!.id)
    setSettings(newSettings)
    setSettingsStore(newSettings)
    applyThemeToDocument(newSettings)
  }

  const handleLogout = async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' }, user?.id)
    } catch (error) {
      // Ignore logout errors
    }
    logout()
  }

  // Show loading screen until hydration is complete
  if (isLoading) {
    return <LoadingScreen />
  }

  // Show auth view if not authenticated
  if (!isAuthenticated || !user) {
    return <AuthView onAuth={setUser} />
  }

  // Show loading while fetching user data
  if (isFetchingData) {
    return <LoadingScreen />
  }

  if (!currentGroup) {
    return (
      <>
        <GroupSelection
          user={user}
          groups={groups}
          onSelectGroup={setCurrentGroup}
          onCreateGroup={() => setShowCreateGroup(true)}
          onJoinGroup={handleJoinGroup}
          onLogout={handleLogout}
          onOpenSettings={() => setShowSettings(true)}
        />
        <CreateGroupDialog
          open={showCreateGroup}
          onOpenChange={setShowCreateGroup}
          onCreate={handleCreateGroup}
        />
        <SettingsDialog
          open={showSettings}
          onOpenChange={setShowSettings}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
        />
      </>
    )
  }

  return (
    <>
      {/* Show loading screen while dashboard loads data */}
      {!dashboardReady && <LoadingScreen />}
      <div style={{ visibility: dashboardReady ? 'visible' : 'hidden' }}>
        <Dashboard
          user={user}
          group={currentGroup}
          onLeaveGroup={handleLeaveGroup}
          onLogout={handleLogout}
          onOpenSettings={() => setShowSettings(true)}
          settings={settings}
          onReady={() => setDashboardReady(true)}
        />
      </div>
      <SettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />
    </>
  )
}
