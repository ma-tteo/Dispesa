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

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 6
const MAX_NAME_LENGTH = 100

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name } = body

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

    // Validate password length
    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `La password deve avere almeno ${MIN_PASSWORD_LENGTH} caratteri` },
        { status: 400 }
      )
    }

    // Validate name length if provided
    if (name && name.length > MAX_NAME_LENGTH) {
      return NextResponse.json(
        { error: `Il nome deve essere inferiore a ${MAX_NAME_LENGTH} caratteri` },
        { status: 400 }
      )
    }

    // Check existing user
    const existingUsers = await query<User>(
      'SELECT id FROM User WHERE email = ?',
      [normalizedEmail]
    )

    if (existingUsers.length > 0) {
      return NextResponse.json(
        { error: 'Email già registrata' },
        { status: 400 }
      )
    }

    // Create user
    const hashedPassword = await bcrypt.hash(password, 10)
    const id = generateId()
    const now = new Date().toISOString()
    const sanitizedName = name?.trim().slice(0, MAX_NAME_LENGTH) || null

    await execute(
      'INSERT INTO User (id, email, name, password, avatar, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, normalizedEmail, sanitizedName, hashedPassword, null, now, now]
    )

    return NextResponse.json({
      user: {
        id,
        email: normalizedEmail,
        name: sanitizedName,
        avatar: null,
        createdAt: now,
        updatedAt: now
      }
    })
  } catch (error) {
    console.error('[API] Register error:', error)
    return NextResponse.json(
      { error: 'Errore durante la registrazione' },
      { status: 500 }
    )
  }
}
