import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/stores - Get all stores (public, read-only data)
// Note: Stores are considered reference data (like categories), so public access is acceptable
export async function GET(_request: NextRequest) {
  try {
    const stores = await db.store.findMany({
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ stores })
  } catch (error) {
    console.error('[API] Error fetching stores:', error)
    return NextResponse.json({ error: 'Errore durante il recupero dei negozi' }, { status: 500 })
  }
}
