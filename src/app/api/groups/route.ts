import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db-turso'
import { nanoid } from 'nanoid'

// Constants
const MAX_GROUP_NAME_LENGTH = 100
const INVITE_CODE_MAX_ATTEMPTS = 5

// Generate unique invite code with retry
async function generateUniqueInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < INVITE_CODE_MAX_ATTEMPTS; attempt++) {
    const code = nanoid(8).toUpperCase()

    // Check if code already exists
    const result = await db.execute({
      sql: 'SELECT id FROM FamilyGroup WHERE inviteCode = ?',
      args: [code],
    })

    if (result.rows.length === 0) {
      return code
    }
  }

  // Fallback: use timestamp-based code
  return `G${Date.now().toString(36).toUpperCase()}`
}

// GET /api/groups - Get user's groups
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    // Get groups with member count
    const result = await db.execute({
      sql: `
        SELECT 
          fg.id, 
          fg.name, 
          fg.inviteCode, 
          fg.ownerId, 
          fg.createdAt, 
          fg.updatedAt,
          COUNT(fm.id) as memberCount
        FROM FamilyGroup fg
        INNER JOIN FamilyMember fm ON fg.id = fm.groupId
        WHERE fg.id IN (
          SELECT groupId FROM FamilyMember WHERE userId = ?
        )
        GROUP BY fg.id
        ORDER BY fg.createdAt DESC
      `,
      args: [userId],
    })

    const groups = result.rows.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      inviteCode: row.inviteCode as string,
      ownerId: row.ownerId as string,
      createdAt: row.createdAt as string,
      updatedAt: row.updatedAt as string,
      memberCount: Number(row.memberCount),
    }))

    return NextResponse.json({ groups })
  } catch (error) {
    console.error('[API] Error fetching groups:', error)
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

    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Il nome del gruppo è obbligatorio' }, { status: 400 })
    }

    const sanitizedName = name.trim().slice(0, MAX_GROUP_NAME_LENGTH)

    if (sanitizedName.length === 0) {
      return NextResponse.json({ error: 'Il nome del gruppo non può essere vuoto' }, { status: 400 })
    }

    const inviteCode = await generateUniqueInviteCode()
    const groupId = nanoid()
    const memberId = nanoid()
    const now = new Date().toISOString()

    // Create group and add creator as member in a transaction
    await db.batch([
      {
        sql: 'INSERT INTO FamilyGroup (id, name, inviteCode, ownerId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
        args: [groupId, sanitizedName, inviteCode, userId, now, now],
      },
      {
        sql: 'INSERT INTO FamilyMember (id, userId, groupId, joinedAt) VALUES (?, ?, ?, ?)',
        args: [memberId, userId, groupId, now],
      },
    ])

    const group = {
      id: groupId,
      name: sanitizedName,
      inviteCode,
      ownerId: userId,
      createdAt: now,
      updatedAt: now,
    }

    return NextResponse.json({ group })
  } catch (error) {
    console.error('[API] Error creating group:', error)
    return NextResponse.json({ error: 'Errore durante la creazione del gruppo' }, { status: 500 })
  }
}
