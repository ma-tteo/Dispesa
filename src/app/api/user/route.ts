import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

// Get user profile
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json({ error: 'Errore durante il recupero utente' }, { status: 500 })
  }
}

// Update user profile
export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const body = await request.json()
    const { name, email, avatar, currentPassword, newPassword } = body

    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
    }

    const updateData: {
      name?: string
      email?: string
      avatar?: string | null
      password?: string
    } = {}

    if (name !== undefined) {
      updateData.name = name?.trim() || null
    }

    if (email !== undefined && email !== user.email) {
      const existingUser = await db.user.findUnique({ where: { email } })
      if (existingUser) {
        return NextResponse.json({ error: 'Email già in uso' }, { status: 400 })
      }
      updateData.email = email
    }

    if (avatar !== undefined) {
      updateData.avatar = avatar || null
    }

    // Handle password change
    if (currentPassword && newPassword) {
      const isValidPassword = await bcrypt.compare(currentPassword, user.password)
      if (!isValidPassword) {
        return NextResponse.json({ error: 'Password attuale non corretta' }, { status: 400 })
      }
      if (newPassword.length < 6) {
        return NextResponse.json({ error: 'La nuova password deve avere almeno 6 caratteri' }, { status: 400 })
      }
      updateData.password = await bcrypt.hash(newPassword, 10)
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json({ error: 'Errore durante l\'aggiornamento' }, { status: 500 })
  }
}

// Delete user account
export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    // Delete user (cascade will handle related data)
    await db.user.delete({ where: { id: userId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json({ error: 'Errore durante l\'eliminazione' }, { status: 500 })
  }
}
