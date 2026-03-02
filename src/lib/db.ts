import { PrismaClient } from '@prisma/client'

// Database paths
const projectDbPath = '/home/z/my-project/db/custom.db'
const persistentDbPath = '/home/z/.dispensa-data/dispensa.db'

// Set DATABASE_URL to project database (which is synced with persistent)
process.env.DATABASE_URL = `file:${projectDbPath}`

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// Sync database to persistent location periodically and on exit
import fs from 'fs'

const syncToPersistent = () => {
  try {
    if (fs.existsSync(projectDbPath)) {
      fs.copyFileSync(projectDbPath, persistentDbPath)
    }
  } catch (e) {
    console.error('Failed to sync database:', e)
  }
}

// Sync every 30 seconds
if (typeof setInterval !== 'undefined') {
  setInterval(syncToPersistent, 30000)
}

// Sync on process exit
if (typeof process !== 'undefined') {
  process.on('beforeExit', syncToPersistent)
  process.on('SIGINT', () => {
    syncToPersistent()
    process.exit(0)
  })
}
