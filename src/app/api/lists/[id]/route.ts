import { NextRequest, NextResponse } from 'next/server'
import { query, execute } from '@/lib/db-turso'

interface List {
  id: string
  name: string
  icon: string | null
  color: string | null
  groupId: string
  createdById: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

interface FamilyMember {
  userId: string
}

// Verify user has access to the list's group
async function verifyListAccess(listId: string, userId: string): Promise<{ hasAccess: boolean; list?: List }> {
  const lists = await query<List>('SELECT * FROM List WHERE id = ?', [listId])

  if (lists.length === 0) {
    return { hasAccess: false }
  }

  const list = lists[0]

  const members = await query<FamilyMember>(
    'SELECT userId FROM FamilyMember WHERE userId = ? AND groupId = ?',
    [userId, list.groupId]
  )

  return { hasAccess: members.length > 0, list }
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

    const updates: string[] = []
    const values: (string | number | null)[] = []

    if (name !== undefined) {
      updates.push('name = ?')
      values.push(name.trim())
    }
    if (icon !== undefined) {
      updates.push('icon = ?')
      values.push(icon || null)
    }
    if (color !== undefined) {
      updates.push('color = ?')
      values.push(color || null)
    }
    if (sortOrder !== undefined) {
      updates.push('sortOrder = ?')
      values.push(sortOrder)
    }

    if (updates.length > 0) {
      updates.push('updatedAt = ?')
      values.push(new Date().toISOString())
      values.push(id)

      await execute(`UPDATE List SET ${updates.join(', ')} WHERE id = ?`, values)
    }

    // Fetch updated list with product count
    const updatedLists = await query<List & { productCount: number }>(`
      SELECT l.*, COUNT(p.id) as productCount
      FROM List l
      LEFT JOIN Product p ON l.id = p.listId
      WHERE l.id = ?
      GROUP BY l.id
    `, [id])

    // Fetch created by user
    const users = await query<{ id: string; name: string | null }>(
      'SELECT id, name FROM User WHERE id = ?',
      [updatedLists[0].createdById]
    )

    const updatedList = {
      ...updatedLists[0],
      createdBy: users[0] || null,
    }

    return NextResponse.json({ list: updatedList })
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

    // Delete all products in the list first
    await execute('DELETE FROM Product WHERE listId = ?', [id])

    // Delete the list
    await execute('DELETE FROM List WHERE id = ?', [id])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Delete list error:', error)
    return NextResponse.json({ error: 'Errore durante l\'eliminazione della lista' }, { status: 500 })
  }
}
