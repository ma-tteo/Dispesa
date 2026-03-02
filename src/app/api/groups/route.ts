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

// Constants
const MAX_GROUP_NAME_LENGTH = 100
const INVITE_CODE_MAX_ATTEMPTS = 5

// Generate unique invite code with retry
async function generateUniqueInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < INVITE_CODE_MAX_ATTEMPTS; attempt++) {
    const code = nanoid(8).toUpperCase()
    
    // Check if code already exists
    const existing = await query<FamilyGroup>(
      'SELECT id FROM FamilyGroup WHERE inviteCode = ?',
      [code]
    )
    
    if (existing.length === 0) {
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

    const id = generateId()
    const inviteCode = await generateUniqueInviteCode()
    const now = new Date().toISOString()

    // Create group
    await execute(
      'INSERT INTO FamilyGroup (id, name, inviteCode, ownerId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
      [id, sanitizedName, inviteCode, userId, now, now]
    )

    // Add creator as member
    const memberId = generateId()
    await execute(
      'INSERT INTO FamilyMember (id, userId, groupId, joinedAt) VALUES (?, ?, ?, ?)',
      [memberId, userId, id, now]
    )

    const group: FamilyGroup = {
      id,
      name: sanitizedName,
      inviteCode,
      ownerId: userId,
      createdAt: now,
      updatedAt: now
    }

    return NextResponse.json({ group })
  } catch (error) {
    console.error('[API] Error creating group:', error)
    return NextResponse.json({ error: 'Errore durante la creazione del gruppo' }, { status: 500 })
  }
}
