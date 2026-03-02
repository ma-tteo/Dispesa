import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

// Configurazione Turso (database cloud persistente)
// Trim per rimuovere eventuali whitespace/newline nascosti
const tursoUrl = process.env.TURSO_DATABASE_URL?.trim()
const tursoToken = process.env.TURSO_AUTH_TOKEN?.trim()

if (!tursoUrl) {
  console.error('[DB] ERROR: TURSO_DATABASE_URL is missing!')
  throw new Error('TURSO_DATABASE_URL is required')
}

if (!tursoToken) {
  console.error('[DB] ERROR: TURSO_AUTH_TOKEN is missing!')
  throw new Error('TURSO_AUTH_TOKEN is required')
}

console.log('[DB] Connecting to Turso:', tursoUrl.substring(0, 40) + '...')

const libsql = createClient({
  url: tursoUrl,
  authToken: tursoToken,
})

const adapter = new PrismaLibSql(libsql)

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
