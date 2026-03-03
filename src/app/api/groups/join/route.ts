import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

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
    const group = await db.familyGroup.findUnique({
      where: { inviteCode: sanitizedCode },
    })

    if (!group) {
      return NextResponse.json(
        { error: 'Codice invito non valido' },
        { status: 404 }
      )
    }

    // Check if user is already a member
    const existingMembership = await db.familyMember.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId: group.id,
        },
      },
    })

    if (existingMembership) {
      return NextResponse.json(
        { error: 'Sei già membro di questo gruppo' },
        { status: 400 }
      )
    }

    // Check if group has room (max members)
    const memberCount = await db.familyMember.count({
      where: { groupId: group.id },
    })

    if (memberCount >= MAX_GROUP_MEMBERS) {
      return NextResponse.json(
        { error: `Il gruppo ha raggiunto il limite massimo di membri (${MAX_GROUP_MEMBERS})` },
        { status: 400 }
      )
    }

    // Add user to group
    await db.familyMember.create({
      data: {
        userId,
        groupId: group.id,
      },
    })

    // Fetch updated group with members and owner
    const updatedGroup = await db.familyGroup.findUnique({
      where: { id: group.id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    })

    return NextResponse.json({ group: updatedGroup })
  } catch (error) {
    console.error('[API] Join group error:', error)
    return NextResponse.json(
      { error: 'Errore durante l\'unione al gruppo' },
      { status: 500 }
    )
  }
}
