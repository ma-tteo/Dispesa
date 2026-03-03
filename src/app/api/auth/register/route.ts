import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

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
    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email già registrata' },
        { status: 400 }
      )
    }

    // Create user
    const hashedPassword = await bcrypt.hash(password, 10)
    const sanitizedName = name?.trim().slice(0, MAX_NAME_LENGTH) || null

    const user = await db.user.create({
      data: {
        email: normalizedEmail,
        name: sanitizedName,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error('[API] Register error:', error)
    return NextResponse.json(
      { error: 'Errore durante la registrazione' },
      { status: 500 }
    )
  }
}
