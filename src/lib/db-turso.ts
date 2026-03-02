import { createClient } from '@libsql/client'

// Configurazione Turso (database cloud persistente)
// Trim per rimuovere eventuali whitespace/newline nascosti
const tursoUrl = process.env.TURSO_DATABASE_URL?.trim()
const tursoToken = process.env.TURSO_AUTH_TOKEN?.trim()

if (!tursoUrl) {
  throw new Error('TURSO_DATABASE_URL is required')
}

if (!tursoToken) {
  throw new Error('TURSO_AUTH_TOKEN is required')
}

console.log('[DB] Connecting to Turso:', tursoUrl.substring(0, 40) + '...')

const client = createClient({
  url: tursoUrl,
  authToken: tursoToken,
})

console.log('[DB] Connected successfully')

// Helper per query con risultati tipizzati
export async function query<T = unknown>(sql: string, args: (string | number | null)[] = []): Promise<T[]> {
  try {
    const result = await client.execute({ sql, args })
    return result.rows as T[]
  } catch (error) {
    console.error('[DB] Query error:', sql, error)
    throw error
  }
}

// Helper per insert/update/delete
export async function execute(sql: string, args: (string | number | null)[] = []): Promise<{ lastInsertRowid: number | bigint | null; rowsAffected: number }> {
  try {
    const result = await client.execute({ sql, args })
    return {
      lastInsertRowid: result.lastInsertRowid,
      rowsAffected: result.rowsAffected
    }
  } catch (error) {
    console.error('[DB] Execute error:', sql, error)
    throw error
  }
}

// Genera ID tipo cuid usando timestamp + random
export function generateId(): string {
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 12)
  return `${timestamp}${randomPart}`
}

export { client }
