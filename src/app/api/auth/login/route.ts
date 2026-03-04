import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db-turso'
import bcrypt from 'bcryptjs'

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e password sono obbligatori' },
        { status: 400 }
      )
    }

    // Validate email format
    const normalizedEmail = email.toLowerCase().trim()
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Formato email non valido' },
        { status: 400 }
      )
    }

    // Query with normalized email
    const result = await db.execute({
      sql: 'SELECT id, email, name, password, avatar, createdAt, updatedAt FROM User WHERE email = ?',
      args: [normalizedEmail],
    })

    // Generic error message to prevent user enumeration
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Credenziali non valide' },
        { status: 401 }
      )
    }

    const user = result.rows[0]
    const isPasswordValid = await bcrypt.compare(password, user.password as string)

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Credenziali non valide' },
        { status: 401 }
      )
    }

    const userWithoutPassword = {
      id: user.id as string,
      email: user.email as string,
      name: user.name as string | null,
      avatar: user.avatar as string | null,
      createdAt: user.createdAt as string,
      updatedAt: user.updatedAt as string,
    }

    return NextResponse.json({ user: userWithoutPassword })
  } catch (error) {
    console.error('[API] Login error:', error)
    return NextResponse.json(
      { error: 'Errore durante il login' },
      { status: 500 }
    )
  }
}
