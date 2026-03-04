import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db-turso'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'

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
    const existingResult = await db.execute({
      sql: 'SELECT id FROM User WHERE email = ?',
      args: [normalizedEmail],
    })

    if (existingResult.rows.length > 0) {
      return NextResponse.json(
        { error: 'Email già registrata' },
        { status: 400 }
      )
    }

    // Create user
    const hashedPassword = await bcrypt.hash(password, 10)
    const sanitizedName = name?.trim().slice(0, MAX_NAME_LENGTH) || null
    const userId = nanoid()
    const now = new Date().toISOString()

    await db.execute({
      sql: 'INSERT INTO User (id, email, name, password, avatar, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [userId, normalizedEmail, sanitizedName, hashedPassword, null, now, now],
    })

    const user = {
      id: userId,
      email: normalizedEmail,
      name: sanitizedName,
      avatar: null,
      createdAt: now,
      updatedAt: now,
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('[API] Register error:', error)
    return NextResponse.json(
      { error: 'Errore durante la registrazione' },
      { status: 500 }
    )
  }
}
