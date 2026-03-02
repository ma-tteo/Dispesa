import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db-turso'

interface User {
  id: string
  email: string
  name: string | null
  avatar: string | null
  createdAt: string
  updatedAt: string
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 401 }
      )
    }

    const users = await query<User>(
      'SELECT id, email, name, avatar, createdAt, updatedAt FROM User WHERE id = ?',
      [userId]
    )

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'Utente non trovato' },
        { status: 404 }
      )
    }

    return NextResponse.json({ user: users[0] })
  } catch (error) {
    console.error('[API] Get current user error:', error)
    return NextResponse.json(
      { error: 'Errore durante il recupero utente' },
      { status: 500 }
    )
  }
}
