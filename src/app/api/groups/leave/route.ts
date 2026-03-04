import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db-turso'

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { groupId } = body

    if (!groupId || typeof groupId !== 'string') {
      return NextResponse.json(
        { error: 'ID gruppo obbligatorio' },
        { status: 400 }
      )
    }

    // Get group
    const groupResult = await db.execute({
      sql: 'SELECT * FROM FamilyGroup WHERE id = ?',
      args: [groupId],
    })

    if (groupResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Gruppo non trovato' },
        { status: 404 }
      )
    }

    const group = groupResult.rows[0]

    // Check if user is the owner
    if (group.ownerId === userId) {
      // If owner leaves, delete the group
      // First delete all products in lists of this group
      await db.execute({
        sql: `
          DELETE FROM Product WHERE listId IN (
            SELECT id FROM List WHERE groupId = ?
          )
        `,
        args: [groupId],
      })

      // Delete all lists in this group
      await db.execute({
        sql: 'DELETE FROM List WHERE groupId = ?',
        args: [groupId],
      })

      // Delete all family members
      await db.execute({
        sql: 'DELETE FROM FamilyMember WHERE groupId = ?',
        args: [groupId],
      })

      // Delete the group
      await db.execute({
        sql: 'DELETE FROM FamilyGroup WHERE id = ?',
        args: [groupId],
      })

      return NextResponse.json({ success: true, deleted: true })
    }

    // Remove user from group
    await db.execute({
      sql: 'DELETE FROM FamilyMember WHERE userId = ? AND groupId = ?',
      args: [userId, groupId],
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Leave group error:', error)
    return NextResponse.json(
      { error: 'Errore durante l\'uscita dal gruppo' },
      { status: 500 }
    )
  }
}
