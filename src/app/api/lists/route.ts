import { NextRequest, NextResponse } from 'next/server'
import { query, execute, generateId } from '@/lib/db-turso'

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
  id: string
  userId: string
  groupId: string
}

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
    const members = await query<FamilyMember>(
      'SELECT id FROM FamilyMember WHERE userId = ? AND groupId = ?',
      [userId, groupId]
    )

    if (members.length === 0) {
      return NextResponse.json({ error: 'Non sei membro di questo gruppo' }, { status: 403 })
    }

    const lists = await query<List & { productCount: number }>(`
      SELECT l.*, COUNT(p.id) as productCount
      FROM List l
      LEFT JOIN Product p ON l.id = p.listId
      WHERE l.groupId = ?
      GROUP BY l.id
      ORDER BY l.sortOrder ASC, l.createdAt DESC
    `, [groupId])

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
    const members = await query<FamilyMember>(
      'SELECT id FROM FamilyMember WHERE userId = ? AND groupId = ?',
      [userId, groupId]
    )

    if (members.length === 0) {
      return NextResponse.json({ error: 'Non sei membro di questo gruppo' }, { status: 403 })
    }

    // Get max sortOrder
    const maxOrder = await query<{ max: number }>(
      'SELECT COALESCE(MAX(sortOrder), -1) as max FROM List WHERE groupId = ?',
      [groupId]
    )
    const sortOrder = (maxOrder[0]?.max ?? -1) + 1

    const id = generateId()
    const now = new Date().toISOString()

    await execute(
      'INSERT INTO List (id, name, icon, color, groupId, createdById, sortOrder, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name.trim(), icon || null, color || null, groupId, userId, sortOrder, now, now]
    )

    const list: List = {
      id,
      name: name.trim(),
      icon: icon || null,
      color: color || null,
      groupId,
      createdById: userId,
      sortOrder,
      createdAt: now,
      updatedAt: now
    }

    return NextResponse.json({ list })
  } catch (error) {
    console.error('Error creating list:', error)
    return NextResponse.json({ error: 'Errore durante la creazione della lista' }, { status: 500 })
  }
}
