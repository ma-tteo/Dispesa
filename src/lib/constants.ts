// App version - update this with each release
export const APP_VERSION = 'alpha-v1.0.9'
export const APP_NAME = 'Dispensa'
export const APP_TAGLINE = 'La tua spesa, organizzata'
export const APP_AUTHOR = 'Dispensa Team'

// Version history for changelog
export const VERSION_HISTORY = [
  {
    version: 'alpha-v1.0.9',
    date: '2025-01-15',
    changes: [
      'Tornato a @libsql/client raw SQL per compatibilità',
      'Rimossi tutti gli endpoint Prisma - ora usano SQL diretto',
    ],
  },
  {
    version: 'alpha-v1.0.8',
    date: '2025-01-15',
    changes: [
      'Fix configurazione database Turso per Vercel',
      'Schema Prisma ora usa DATABASE_URL env variable',
    ],
  },
  {
    version: 'alpha-v1.0.7',
    date: '2025-01-15',
    changes: [
      'Configurato Prisma per usare Turso su Vercel',
      'Aggiunto adapter libsql per connessione database cloud',
    ],
  },
  {
    version: 'alpha-v1.0.6',
    date: '2025-01-15',
    changes: [
      'Migrato da Turso a Prisma ORM per compatibilità Vercel',
      'Rimosso @libsql/client - ora usa solo Prisma',
      'Fix errore build "Module not found: @libsql/client"',
    ],
  },
  {
    version: 'alpha-v1.0.5',
    date: '2025-01-15',
    changes: [
      'Fix race condition - Dashboard nascosto finché dati non pronti',
      'LoadingScreen con z-index alto copre tutto',
    ],
  },
  {
    version: 'alpha-v1.0.4',
    date: '2025-01-15',
    changes: [
      'Fix caricamento progressivo - interfaccia appare completa',
      'LoadingScreen mostra mentre Dashboard carica in background',
    ],
  },
  {
    version: 'alpha-v1.0.3',
    date: '2025-01-15',
    changes: [
      'Fix blocco schermata caricamento',
      'Ottimizzato caricamento dati Dashboard',
    ],
  },
  {
    version: 'alpha-v1.0.2',
    date: '2025-01-15',
    changes: [
      'Fix caricamento progressivo - ora tutto carica in background',
      'Card prodotti più compatte su singola riga',
      'Rimossi overlay di loading ridondanti',
    ],
  },
  {
    version: 'alpha-v1.0.1',
    date: '2025-01-15',
    changes: [
      'Schermata di caricamento unificata',
      'Migliorata gestione errori di rete',
      'Fix crash su errori API',
    ],
  },
  {
    version: '1.0.0',
    date: '2025-01-15',
    changes: [
      'Prima versione pubblica',
      'Liste multiple per gruppo',
      'Swipe gestures per completare/eliminare',
      'Impostazioni personalizzabili',
      'Sincronizzazione in tempo reale',
    ],
  },
]

// Default categories with icons and colors
export const DEFAULT_CATEGORIES = [
  { name: 'Frutta e Verdura', icon: '🥬', color: '#22c55e' },
  { name: 'Latticini e Uova', icon: '🥛', color: '#3b82f6' },
  { name: 'Carne', icon: '🥩', color: '#ef4444' },
  { name: 'Pesce', icon: '🐟', color: '#06b6d4' },
  { name: 'Pasta e Riso', icon: '🍝', color: '#f59e0b' },
  { name: 'Pane e Cereali', icon: '🍞', color: '#d97706' },
  { name: 'Condimenti', icon: '🫒', color: '#84cc16' },
  { name: 'Bevande', icon: '🥤', color: '#8b5cf6' },
  { name: 'Dolci e Snack', icon: '🍪', color: '#ec4899' },
  { name: 'Surgelati', icon: '🧊', color: '#0ea5e9' },
  { name: 'Igiene Casa', icon: '🧹', color: '#14b8a6' },
  { name: 'Igiene Personale', icon: '🧴', color: '#f472b6' },
  { name: 'Bebè', icon: '🍼', color: '#fb923c' },
  { name: 'Animali', icon: '🐕', color: '#a78bfa' },
  { name: 'Altro', icon: '📦', color: '#64748b' },
]

// Default stores
export const DEFAULT_STORES = [
  { name: 'Conad', icon: '🛒', color: '#f97316' },
  { name: 'Esselunga', icon: '🏪', color: '#dc2626' },
  { name: 'Coop', icon: '🛍️', color: '#2563eb' },
  { name: 'Lidl', icon: '🏷️', color: '#16a34a' },
  { name: 'Aldi', icon: '💰', color: '#ea580c' },
  { name: 'Carrefour', icon: '🛒', color: '#0891b2' },
  { name: 'Eurospin', icon: '💸', color: '#dc2626' },
  { name: 'MD', icon: '🛒', color: '#7c3aed' },
  { name: 'Pam', icon: '🏪', color: '#059669' },
  { name: 'Tigros', icon: '🛒', color: '#e11d48' },
  { name: 'Unes', icon: '🏪', color: '#0284c7' },
  { name: 'Dico', icon: '🛒', color: '#7c3aed' },
]
