import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { nanoid } from 'nanoid'

// Constants
const MAX_GROUP_NAME_LENGTH = 100
const INVITE_CODE_MAX_ATTEMPTS = 5

// Generate unique invite code with retry
async function generateUniqueInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < INVITE_CODE_MAX_ATTEMPTS; attempt++) {
    const code = nanoid(8).toUpperCase()

    // Check if code already exists
    const existing = await db.familyGroup.findUnique({
      where: { inviteCode: code },
    })

    if (!existing) {
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

    const groups = await db.familyGroup.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        _count: {
          select: { members: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Transform to match expected format with memberCount
    const groupsWithMemberCount = groups.map((g) => ({
      id: g.id,
      name: g.name,
      inviteCode: g.inviteCode,
      ownerId: g.ownerId,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
      memberCount: g._count.members,
    }))

    return NextResponse.json({ groups: groupsWithMemberCount })
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

    // Create group with the creator as owner and member
    const group = await db.familyGroup.create({
      data: {
        name: sanitizedName,
        inviteCode,
        ownerId: userId,
        members: {
          create: {
            userId,
          },
        },
      },
    })

    return NextResponse.json({ group })
  } catch (error) {
    console.error('[API] Error creating group:', error)
    return NextResponse.json({ error: 'Errore durante la creazione del gruppo' }, { status: 500 })
  }
}
