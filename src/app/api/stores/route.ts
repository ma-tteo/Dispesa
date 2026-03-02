import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db-turso'

interface Store {
  id: string
  name: string
  icon: string | null
  color: string | null
  createdAt: string
}

// GET /api/stores - Get all stores (public, read-only data)
// Note: Stores are considered reference data (like categories), so public access is acceptable
export async function GET(_request: NextRequest) {
  try {
    const stores = await query<Store>(
      'SELECT * FROM Store ORDER BY name ASC'
    )

    return NextResponse.json({ stores })
  } catch (error) {
    console.error('[API] Error fetching stores:', error)
    return NextResponse.json({ error: 'Errore durante il recupero dei negozi' }, { status: 500 })
  }
}
