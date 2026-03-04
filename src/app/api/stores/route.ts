import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db-turso'

// GET /api/stores - Get all stores (public, read-only data)
// Note: Stores are considered reference data (like categories), so public access is acceptable
export async function GET(_request: NextRequest) {
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM Store ORDER BY name ASC',
      args: [],
    })

    const stores = result.rows.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      icon: row.icon as string | null,
      color: row.color as string | null,
      createdAt: row.createdAt as string,
    }))

    return NextResponse.json({ stores })
  } catch (error) {
    console.error('[API] Error fetching stores:', error)
    return NextResponse.json({ error: 'Errore durante il recupero dei negozi' }, { status: 500 })
  }
}
