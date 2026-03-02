import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { nanoid } from 'nanoid'

// Get user's groups
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 401 }
      )
    }

    const memberships = await db.familyMember.findMany({
      where: { userId },
      include: {
        group: {
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
        },
      },
    })

    const groups = memberships.map((m) => m.group)

    return NextResponse.json({ groups })
  } catch (error) {
    console.error('Get groups error:', error)
    return NextResponse.json(
      { error: 'Errore durante il recupero dei gruppi' },
      { status: 500 }
    )
  }
}

// Create a new group
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
    const { name } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Il nome del gruppo è obbligatorio' },
        { status: 400 }
      )
    }

    const inviteCode = nanoid(8).toUpperCase()

    const group = await db.familyGroup.create({
      data: {
        name: name.trim(),
        inviteCode,
        ownerId: userId,
        members: {
          create: {
            userId,
          },
        },
      },
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

    return NextResponse.json({ group })
  } catch (error) {
    console.error('Create group error:', error)
    return NextResponse.json(
      { error: 'Errore durante la creazione del gruppo' },
      { status: 500 }
    )
  }
}
