import { NextRequest, NextResponse } from 'next/server'
import { query, execute, generateId } from '@/lib/db-turso'
import { nanoid } from 'nanoid'

interface FamilyGroup {
  id: string
  name: string
  inviteCode: string
  ownerId: string
  createdAt: string
  updatedAt: string
}

interface FamilyMember {
  id: string
  userId: string
  groupId: string
  joinedAt: string
}

// GET /api/groups - Get user's groups
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const groups = await query<FamilyGroup & { memberCount: number }>(`
      SELECT g.*, COUNT(m.id) as memberCount
      FROM FamilyGroup g
      JOIN FamilyMember m ON g.id = m.groupId
      WHERE m.userId = ?
      GROUP BY g.id
      ORDER BY g.createdAt DESC
    `, [userId])

    return NextResponse.json({ groups })
  } catch (error) {
    console.error('Error fetching groups:', error)
    return NextResponse.json({ error: 'Errore durante il recupero dei gruppi' }, { status: 500 })
  }
}

// POST /api/groups - Create a new group
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const body = await request.json()
    const { name } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Il nome del gruppo è obbligatorio' }, { status: 400 })
    }

    const id = generateId()
    const inviteCode = nanoid(8).toUpperCase()
    const now = new Date().toISOString()

    // Create group
    await execute(
      'INSERT INTO FamilyGroup (id, name, inviteCode, ownerId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name.trim(), inviteCode, userId, now, now]
    )

    // Add creator as member
    const memberId = generateId()
    await execute(
      'INSERT INTO FamilyMember (id, userId, groupId, joinedAt) VALUES (?, ?, ?, ?)',
      [memberId, userId, id, now]
    )

    const group: FamilyGroup = {
      id,
      name: name.trim(),
      inviteCode,
      ownerId: userId,
      createdAt: now,
      updatedAt: now
    }

    return NextResponse.json({ group })
  } catch (error) {
    console.error('Error creating group:', error)
    return NextResponse.json({ error: 'Errore durante la creazione del gruppo' }, { status: 500 })
  }
}
