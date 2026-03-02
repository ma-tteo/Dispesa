import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

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

    if (!inviteCode) {
      return NextResponse.json(
        { error: 'Codice invito obbligatorio' },
        { status: 400 }
      )
    }

    const group = await db.familyGroup.findUnique({
      where: { inviteCode: inviteCode.toUpperCase() },
      include: {
        members: true,
      },
    })

    if (!group) {
      return NextResponse.json(
        { error: 'Codice invito non valido' },
        { status: 404 }
      )
    }

    // Check if user is already a member
    const existingMembership = group.members.find((m) => m.userId === userId)
    if (existingMembership) {
      return NextResponse.json(
        { error: 'Sei già membro di questo gruppo' },
        { status: 400 }
      )
    }

    // Check if group has room (max 10 members)
    if (group.members.length >= 10) {
      return NextResponse.json(
        { error: 'Il gruppo ha raggiunto il limite massimo di membri (10)' },
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

    // Fetch updated group with members
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
    console.error('Join group error:', error)
    return NextResponse.json(
      { error: 'Errore durante l\'unione al gruppo' },
      { status: 500 }
    )
  }
}
