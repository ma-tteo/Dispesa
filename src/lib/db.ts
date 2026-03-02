import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

// Determine database path
const possiblePaths = [
  '/home/z/.dispensa-data/dispensa.db',  // Persistent location (priority)
  '/home/z/my-project/db/custom.db',      // Project location
  path.join(process.cwd(), 'db', 'custom.db'), // Relative path
]

let dbPath = possiblePaths[0]

// Find the first existing database
for (const p of possiblePaths) {
  if (fs.existsSync(p)) {
    dbPath = p
    break
  }
}

// If no database exists, create in first location
const dbDir = path.dirname(dbPath)
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

// Set DATABASE_URL
process.env.DATABASE_URL = `file:${dbPath}`

console.log(`[DB] Using database at: ${dbPath}`)

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
