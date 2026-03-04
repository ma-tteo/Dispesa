import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db-turso'
import { nanoid } from 'nanoid'

// GET /api/lists - Get lists for a group
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('groupId')

    if (!groupId) {
      return NextResponse.json({ error: 'GroupId è obbligatorio' }, { status: 400 })
    }

    // Check if user is member of the group
    const membershipResult = await db.execute({
      sql: 'SELECT id FROM FamilyMember WHERE userId = ? AND groupId = ?',
      args: [userId, groupId],
    })

    if (membershipResult.rows.length === 0) {
      return NextResponse.json({ error: 'Non sei membro di questo gruppo' }, { status: 403 })
    }

    // Get lists with product count
    const listsResult = await db.execute({
      sql: `
        SELECT 
          l.id, 
          l.name, 
          l.icon, 
          l.color, 
          l.groupId, 
          l.createdById, 
          l.sortOrder, 
          l.createdAt, 
          l.updatedAt,
          (SELECT COUNT(*) FROM Product p WHERE p.listId = l.id) as productCount
        FROM List l
        WHERE l.groupId = ?
        ORDER BY l.sortOrder ASC, l.createdAt DESC
      `,
      args: [groupId],
    })

    const lists = listsResult.rows.map((row) => ({
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
    }))

    return NextResponse.json({ lists })
  } catch (error) {
    console.error('Error fetching lists:', error)
    return NextResponse.json({ error: 'Errore durante il recupero delle liste' }, { status: 500 })
  }
}

// POST /api/lists - Create a new list
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const body = await request.json()
    const { name, groupId, icon, color } = body

    if (!name || !groupId) {
      return NextResponse.json({ error: 'Nome e gruppo sono obbligatori' }, { status: 400 })
    }

    // Check if user is member of the group
    const membershipResult = await db.execute({
      sql: 'SELECT id FROM FamilyMember WHERE userId = ? AND groupId = ?',
      args: [userId, groupId],
    })

    if (membershipResult.rows.length === 0) {
      return NextResponse.json({ error: 'Non sei membro di questo gruppo' }, { status: 403 })
    }

    // Get max sortOrder
    const maxSortResult = await db.execute({
      sql: 'SELECT MAX(sortOrder) as maxSort FROM List WHERE groupId = ?',
      args: [groupId],
    })

    const sortOrder = (Number(maxSortResult.rows[0]?.maxSort ?? -1)) + 1

    const listId = nanoid()
    const now = new Date().toISOString()

    await db.execute({
      sql: 'INSERT INTO List (id, name, icon, color, groupId, createdById, sortOrder, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [listId, name.trim(), icon || null, color || null, groupId, userId, sortOrder, now, now],
    })

    const list = {
      id: listId,
      name: name.trim(),
      icon: icon || null,
      color: color || null,
      groupId,
      createdById: userId,
      sortOrder,
      createdAt: now,
      updatedAt: now,
    }

    return NextResponse.json({ list })
  } catch (error) {
    console.error('Error creating list:', error)
    return NextResponse.json({ error: 'Errore durante la creazione della lista' }, { status: 500 })
  }
}
