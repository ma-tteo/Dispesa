import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db-turso'

interface Store {
  id: string
  name: string
  icon: string | null
  color: string | null
  createdAt: string
}

// GET /api/stores
export async function GET(request: NextRequest) {
  try {
    const stores = await query<Store>(
      'SELECT * FROM Store ORDER BY name ASC'
    )

    return NextResponse.json({ stores })
  } catch (error) {
    console.error('Error fetching stores:', error)
    return NextResponse.json({ error: 'Errore durante il recupero dei negozi' }, { status: 500 })
  }
}
