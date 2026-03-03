import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db-turso'

// Verify user has access to the list's group
async function verifyListAccess(listId: string, userId: string) {
  const listResult = await db.execute({
    sql: `
      SELECT l.*, fm.id as membershipId
      FROM List l
      INNER JOIN FamilyGroup fg ON l.groupId = fg.id
      LEFT JOIN FamilyMember fm ON fm.groupId = fg.id AND fm.userId = ?
      WHERE l.id = ?
    `,
    args: [userId, listId],
  })

  if (listResult.rows.length === 0) {
    return { hasAccess: false, list: null }
  }

  const row = listResult.rows[0]
  const hasAccess = row.membershipId !== null

  const list = {
    id: row.id as string,
    name: row.name as string,
    icon: row.icon as string | null,
    color: row.color as string | null,
    groupId: row.groupId as string,
    createdById: row.createdById as string,
    sortOrder: Number(row.sortOrder),
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string,
  }

  return { hasAccess, list }
}

// Update a list
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id')
    const { id } = await params

    if (!userId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { hasAccess, list } = await verifyListAccess(id, userId)

    if (!hasAccess || !list) {
      return NextResponse.json({ error: 'Lista non trovata o non autorizzato' }, { status: 404 })
    }

    const body = await request.json()
    const { name, icon, color, sortOrder } = body

    // Build update
    const updates: string[] = []
    const args: (string | number | null)[] = []

    if (name !== undefined) {
      updates.push('name = ?')
      args.push(name.trim())
    }
    if (icon !== undefined) {
      updates.push('icon = ?')
      args.push(icon || null)
    }
    if (color !== undefined) {
      updates.push('color = ?')
      args.push(color || null)
    }
    if (sortOrder !== undefined) {
      updates.push('sortOrder = ?')
      args.push(sortOrder)
    }

    if (updates.length > 0) {
      updates.push('updatedAt = ?')
      args.push(new Date().toISOString())
      args.push(id)

      await db.execute({
        sql: `UPDATE List SET ${updates.join(', ')} WHERE id = ?`,
        args,
      })
    }

    // Fetch updated list with product count and created by user
    const updatedResult = await db.execute({
      sql: `
        SELECT 
          l.id, l.name, l.icon, l.color, l.groupId, l.createdById, l.sortOrder, l.createdAt, l.updatedAt,
          (SELECT COUNT(*) FROM Product p WHERE p.listId = l.id) as productCount,
          u.id as userId, u.name as userName
        FROM List l
        LEFT JOIN User u ON l.createdById = u.id
        WHERE l.id = ?
      `,
      args: [id],
    })

    if (updatedResult.rows.length === 0) {
      return NextResponse.json({ list: null })
    }

    const row = updatedResult.rows[0]
    const result = {
      id: row.id as string,
      name: row.name as string,
      icon: row.icon as string | null,
      color: row.color as string | null,
      groupId: row.groupId as string,
      createdById: row.createdById as string,
      sortOrder: Number(row.sortOrder),
      createdAt: row.createdAt as string,
      updatedAt: row.updatedAt as string,
      productCount: Number(row.productCount),
      createdBy: row.userId ? {
        id: row.userId as string,
        name: row.userName as string | null,
      } : null,
    }

    return NextResponse.json({ list: result })
  } catch (error) {
    console.error('[API] Update list error:', error)
    return NextResponse.json({ error: 'Errore durante l\'aggiornamento della lista' }, { status: 500 })
  }
}

// Delete a list
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id')
    const { id } = await params

    if (!userId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { hasAccess, list } = await verifyListAccess(id, userId)

    if (!hasAccess || !list) {
      return NextResponse.json({ error: 'Lista non trovata o non autorizzato' }, { status: 404 })
    }

    // Delete products first
    await db.execute({
      sql: 'DELETE FROM Product WHERE listId = ?',
      args: [id],
    })

    // Delete the list
    await db.execute({
      sql: 'DELETE FROM List WHERE id = ?',
      args: [id],
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Delete list error:', error)
    return NextResponse.json({ error: 'Errore durante l\'eliminazione della lista' }, { status: 500 })
  }
}
