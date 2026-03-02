import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

// ALWAYS use persistent database location
const PERSISTENT_DIR = '/home/z/.dispensa-data'
const PERSISTENT_DB = `${PERSISTENT_DIR}/dispensa.db`

// Ensure persistent directory exists
if (!fs.existsSync(PERSISTENT_DIR)) {
  fs.mkdirSync(PERSISTENT_DIR, { recursive: true })
  console.log('[DB] Created persistent directory:', PERSISTENT_DIR)
}

// Check if persistent database exists, if not we need to initialize it
const dbExists = fs.existsSync(PERSISTENT_DB)

// ALWAYS set DATABASE_URL to persistent location
process.env.DATABASE_URL = `file:${PERSISTENT_DB}`

console.log(`[DB] Using database at: ${PERSISTENT_DB} (exists: ${dbExists})`)

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
