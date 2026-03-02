import { NextRequest, NextResponse } from 'next/server'
import { query, execute, generateId } from '@/lib/db-turso'
import bcrypt from 'bcryptjs'

interface User {
  id: string
  email: string
  name: string | null
  password: string
  avatar: string | null
  createdAt: string
  updatedAt: string
}

export async function POST(request: NextRequest) {
  try {
    console.log('[REGISTER] Starting registration...')
    const body = await request.json()
    const { email, password, name } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e password sono obbligatori' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La password deve avere almeno 6 caratteri' },
        { status: 400 }
      )
    }

    // Check existing user
    console.log('[REGISTER] Checking existing user...')
    const existingUsers = await query<User>('SELECT id FROM User WHERE email = ?', [email])

    if (existingUsers.length > 0) {
      return NextResponse.json(
        { error: 'Email già registrata' },
        { status: 400 }
      )
    }

    // Create user
    console.log('[REGISTER] Creating user...')
    const hashedPassword = await bcrypt.hash(password, 10)
    const id = generateId()
    const now = new Date().toISOString()

    await execute(
      'INSERT INTO User (id, email, name, password, avatar, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, email, name || null, hashedPassword, null, now, now]
    )

    console.log('[REGISTER] User created:', id)

    return NextResponse.json({
      user: {
        id,
        email,
        name: name || null,
        avatar: null,
        createdAt: now,
        updatedAt: now
      }
    })
  } catch (error) {
    console.error('[REGISTER] Error:', error)
    return NextResponse.json(
      { error: 'Errore durante la registrazione: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    )
  }
}
