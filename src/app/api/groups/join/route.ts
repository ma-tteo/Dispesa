import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db-turso'
import { nanoid } from 'nanoid'

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
    const groupResult = await db.execute({
      sql: 'SELECT * FROM FamilyGroup WHERE inviteCode = ?',
      args: [sanitizedCode],
    })

    if (groupResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Codice invito non valido' },
        { status: 404 }
      )
    }

    const group = groupResult.rows[0]
    const groupId = group.id as string

    // Check if user is already a member
    const membershipResult = await db.execute({
      sql: 'SELECT id FROM FamilyMember WHERE userId = ? AND groupId = ?',
      args: [userId, groupId],
    })

    if (membershipResult.rows.length > 0) {
      return NextResponse.json(
        { error: 'Sei già membro di questo gruppo' },
        { status: 400 }
      )
    }

    // Check if group has room (max members)
    const memberCountResult = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM FamilyMember WHERE groupId = ?',
      args: [groupId],
    })

    const memberCount = Number(memberCountResult.rows[0]?.count || 0)

    if (memberCount >= MAX_GROUP_MEMBERS) {
      return NextResponse.json(
        { error: `Il gruppo ha raggiunto il limite massimo di membri (${MAX_GROUP_MEMBERS})` },
        { status: 400 }
      )
    }

    // Add user to group
    const memberId = nanoid()
    const now = new Date().toISOString()

    await db.execute({
      sql: 'INSERT INTO FamilyMember (id, userId, groupId, joinedAt) VALUES (?, ?, ?, ?)',
      args: [memberId, userId, groupId, now],
    })

    // Fetch updated group with members and owner
    const membersResult = await db.execute({
      sql: `
        SELECT 
          fm.id as memberId,
          fm.joinedAt,
          u.id, u.name, u.email, u.avatar
        FROM FamilyMember fm
        INNER JOIN User u ON fm.userId = u.id
        WHERE fm.groupId = ?
      `,
      args: [groupId],
    })

    const ownerResult = await db.execute({
      sql: 'SELECT id, name, email, avatar FROM User WHERE id = ?',
      args: [group.ownerId as string],
    })

    const members = membersResult.rows.map((row) => ({
      id: row.memberId as string,
      userId: row.id as string,
      groupId: groupId,
      joinedAt: row.joinedAt as string,
      user: {
        id: row.id as string,
        name: row.name as string | null,
        email: row.email as string,
        avatar: row.avatar as string | null,
      },
    }))

    const owner = ownerResult.rows[0] ? {
      id: ownerResult.rows[0].id as string,
      name: ownerResult.rows[0].name as string | null,
      email: ownerResult.rows[0].email as string,
      avatar: ownerResult.rows[0].avatar as string | null,
    } : null

    const updatedGroup = {
      id: group.id as string,
      name: group.name as string,
      inviteCode: group.inviteCode as string,
      ownerId: group.ownerId as string,
      createdAt: group.createdAt as string,
      updatedAt: group.updatedAt as string,
      members,
      owner,
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
