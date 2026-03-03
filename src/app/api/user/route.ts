import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db-turso'
import bcrypt from 'bcryptjs'

// Get user profile
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const result = await db.execute({
      sql: 'SELECT id, email, name, avatar, createdAt, updatedAt FROM User WHERE id = ?',
      args: [userId],
    })

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
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
    const userResult = await db.execute({
      sql: 'SELECT * FROM User WHERE id = ?',
      args: [userId],
    })

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
    }

    const user = userResult.rows[0]

    // Build update
    const updates: string[] = []
    const args: (string | number | null)[] = []

    if (name !== undefined) {
      updates.push('name = ?')
      args.push(name?.trim() || null)
    }

    if (email !== undefined && email !== user.email) {
      // Check if email is already in use
      const existingUserResult = await db.execute({
        sql: 'SELECT id FROM User WHERE email = ? AND id != ?',
        args: [email, userId],
      })

      if (existingUserResult.rows.length > 0) {
        return NextResponse.json({ error: 'Email già in uso' }, { status: 400 })
      }
      updates.push('email = ?')
      args.push(email)
    }

    if (avatar !== undefined) {
      updates.push('avatar = ?')
      args.push(avatar || null)
    }

    // Handle password change
    if (currentPassword && newPassword) {
      const isValidPassword = await bcrypt.compare(currentPassword, user.password as string)
      if (!isValidPassword) {
        return NextResponse.json({ error: 'Password attuale non corretta' }, { status: 400 })
      }
      if (newPassword.length < 6) {
        return NextResponse.json({ error: 'La nuova password deve avere almeno 6 caratteri' }, { status: 400 })
      }
      updates.push('password = ?')
      args.push(await bcrypt.hash(newPassword, 10))
    }

    // Update user
    if (updates.length > 0) {
      updates.push('updatedAt = ?')
      args.push(new Date().toISOString())
      args.push(userId)

      await db.execute({
        sql: `UPDATE User SET ${updates.join(', ')} WHERE id = ?`,
        args,
      })
    }

    // Fetch updated user
    const updatedResult = await db.execute({
      sql: 'SELECT id, email, name, avatar, createdAt, updatedAt FROM User WHERE id = ?',
      args: [userId],
    })

    const row = updatedResult.rows[0]
    const updatedUser = {
      id: row.id as string,
      email: row.email as string,
      name: row.name as string | null,
      avatar: row.avatar as string | null,
      createdAt: row.createdAt as string,
      updatedAt: row.updatedAt as string,
    }

    return NextResponse.json({ user: updatedUser })
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

    // Delete user (need to handle cascade manually)
    // First, find all groups owned by user
    const groupsResult = await db.execute({
      sql: 'SELECT id FROM FamilyGroup WHERE ownerId = ?',
      args: [userId],
    })

    // Delete products in lists of user's groups
    for (const group of groupsResult.rows) {
      const groupId = group.id as string
      
      // Delete products in lists of this group
      await db.execute({
        sql: `
          DELETE FROM Product WHERE listId IN (
            SELECT id FROM List WHERE groupId = ?
          )
        `,
        args: [groupId],
      })

      // Delete lists in this group
      await db.execute({
        sql: 'DELETE FROM List WHERE groupId = ?',
        args: [groupId],
      })

      // Delete family members
      await db.execute({
        sql: 'DELETE FROM FamilyMember WHERE groupId = ?',
        args: [groupId],
      })

      // Delete the group
      await db.execute({
        sql: 'DELETE FROM FamilyGroup WHERE id = ?',
        args: [groupId],
      })
    }

    // Delete products created by user in other groups
    await db.execute({
      sql: 'DELETE FROM Product WHERE createdById = ?',
      args: [userId],
    })

    // Delete family memberships
    await db.execute({
      sql: 'DELETE FROM FamilyMember WHERE userId = ?',
      args: [userId],
    })

    // Delete user settings
    await db.execute({
      sql: 'DELETE FROM UserSettings WHERE userId = ?',
      args: [userId],
    })

    // Delete user
    await db.execute({
      sql: 'DELETE FROM User WHERE id = ?',
      args: [userId],
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Delete user error:', error)
    return NextResponse.json({ error: 'Errore durante l\'eliminazione' }, { status: 500 })
  }
}
