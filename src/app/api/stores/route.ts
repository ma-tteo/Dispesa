import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const stores = await db.store.findMany({
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ stores })
  } catch (error) {
    console.error('Get stores error:', error)
    return NextResponse.json(
      { error: 'Errore durante il recupero dei negozi' },
      { status: 500 }
    )
  }
}
