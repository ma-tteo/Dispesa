import { createClient } from '@libsql/client'

const tursoUrl = process.env.TURSO_DATABASE_URL
const tursoToken = process.env.TURSO_AUTH_TOKEN

// Create Turso client for production or local development
export const db = createClient({
  url: tursoUrl || 'file:./db/custom.db',
  authToken: tursoToken || undefined,
})
