import { NextRequest, NextResponse } from 'next/server'
import { query, execute } from '@/lib/db-turso'
import bcrypt from 'bcryptjs'

interface User {
  id: string
  email: string
  name: string | null
  avatar: string | null
  password: string
  createdAt: string
  updatedAt: string
}

// Get user profile
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const users = await query<User>(
      'SELECT id, email, name, avatar, createdAt, updatedAt FROM User WHERE id = ?',
      [userId]
    )

    if (users.length === 0) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
    }

    const { password: _, ...userWithoutPassword } = users[0]
    return NextResponse.json({ user: userWithoutPassword })
  } catch (error) {
    console.error('[API] Get user error:', error)
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

    // Get current user
    const users = await query<User>('SELECT * FROM User WHERE id = ?', [userId])
    if (users.length === 0) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
    }
    const user = users[0]

    const updates: string[] = []
    const values: (string | number | null)[] = []

    if (name !== undefined) {
      updates.push('name = ?')
      values.push(name?.trim() || null)
    }

    if (email !== undefined && email !== user.email) {
      // Check if email is already in use
      const existingUsers = await query<User>('SELECT id FROM User WHERE email = ? AND id != ?', [email, userId])
      if (existingUsers.length > 0) {
        return NextResponse.json({ error: 'Email già in uso' }, { status: 400 })
      }
      updates.push('email = ?')
      values.push(email)
    }

    if (avatar !== undefined) {
      updates.push('avatar = ?')
      values.push(avatar || null)
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
      updates.push('password = ?')
      values.push(await bcrypt.hash(newPassword, 10))
    }

    if (updates.length > 0) {
      updates.push('updatedAt = ?')
      values.push(new Date().toISOString())
      values.push(userId)

      await execute(`UPDATE User SET ${updates.join(', ')} WHERE id = ?`, values)
    }

    // Fetch updated user
    const updatedUsers = await query<User>(
      'SELECT id, email, name, avatar, createdAt, updatedAt FROM User WHERE id = ?',
      [userId]
    )

    return NextResponse.json({ user: updatedUsers[0] })
  } catch (error) {
    console.error('[API] Update user error:', error)
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

    // Delete user (cascade handled by database)
    await execute('DELETE FROM User WHERE id = ?', [userId])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Delete user error:', error)
    return NextResponse.json({ error: 'Errore durante l\'eliminazione' }, { status: 500 })
  }
}
