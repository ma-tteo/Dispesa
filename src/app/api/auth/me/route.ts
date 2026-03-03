import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db-turso'

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 401 }
      )
    }

    const result = await db.execute({
      sql: 'SELECT id, email, name, avatar, createdAt, updatedAt FROM User WHERE id = ?',
      args: [userId],
    })

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Utente non trovato' },
        { status: 404 }
      )
    }

    const row = result.rows[0]
    const user = {
      id: row.id as string,
      email: row.email as string,
      name: row.name as string | null,
      avatar: row.avatar as string | null,
      createdAt: row.createdAt as string,
      updatedAt: row.updatedAt as string,
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('[API] Get current user error:', error)
    return NextResponse.json(
      { error: 'Errore durante il recupero utente' },
      { status: 500 }
    )
  }
}
