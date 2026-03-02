import { NextRequest, NextResponse } from 'next/server'
import { query, execute, generateId } from '@/lib/db-turso'

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

interface User {
  id: string
  name: string | null
  email: string
  avatar: string | null
}

// Constants
const MAX_GROUP_MEMBERS = 10

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
    const { inviteCode } = body

    if (!inviteCode || typeof inviteCode !== 'string') {
      return NextResponse.json(
        { error: 'Codice invito obbligatorio' },
        { status: 400 }
      )
    }

    // Sanitize invite code
    const sanitizedCode = inviteCode.toUpperCase().trim().slice(0, 20)

    // Find group by invite code
    const groups = await query<FamilyGroup>(
      'SELECT * FROM FamilyGroup WHERE inviteCode = ?',
      [sanitizedCode]
    )

    if (groups.length === 0) {
      return NextResponse.json(
        { error: 'Codice invito non valido' },
        { status: 404 }
      )
    }

    const group = groups[0]

    // Check if user is already a member
    const existingMemberships = await query<FamilyMember>(
      'SELECT id FROM FamilyMember WHERE userId = ? AND groupId = ?',
      [userId, group.id]
    )

    if (existingMemberships.length > 0) {
      return NextResponse.json(
        { error: 'Sei già membro di questo gruppo' },
        { status: 400 }
      )
    }

    // Check if group has room (max members)
    const memberCount = await query<{ count: number }>(
      'SELECT COUNT(*) as count FROM FamilyMember WHERE groupId = ?',
      [group.id]
    )

    if ((memberCount[0]?.count ?? 0) >= MAX_GROUP_MEMBERS) {
      return NextResponse.json(
        { error: `Il gruppo ha raggiunto il limite massimo di membri (${MAX_GROUP_MEMBERS})` },
        { status: 400 }
      )
    }

    // Add user to group
    const memberId = generateId()
    const now = new Date().toISOString()

    await execute(
      'INSERT INTO FamilyMember (id, userId, groupId, joinedAt) VALUES (?, ?, ?, ?)',
      [memberId, userId, group.id, now]
    )

    // Fetch all members with user info
    const members = await query<FamilyMember & User>(`
      SELECT m.id, m.userId, m.groupId, m.joinedAt, u.id, u.name, u.email, u.avatar
      FROM FamilyMember m
      JOIN User u ON m.userId = u.id
      WHERE m.groupId = ?
    `, [group.id])

    // Fetch owner info
    const owners = await query<User>(
      'SELECT id, name, email, avatar FROM User WHERE id = ?',
      [group.ownerId]
    )

    const updatedGroup = {
      ...group,
      members: members.map(m => ({
        id: m.id,
        userId: m.userId,
        groupId: m.groupId,
        joinedAt: m.joinedAt,
        user: {
          id: m.userId,
          name: m.name,
          email: m.email,
          avatar: m.avatar,
        }
      })),
      owner: owners[0] || null,
    }

    return NextResponse.json({ group: updatedGroup })
  } catch (error) {
    console.error('[API] Join group error:', error)
    return NextResponse.json(
      { error: 'Errore durante l\'unione al gruppo' },
      { status: 500 }
    )
  }
}
