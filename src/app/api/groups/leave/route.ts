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
    const { groupId } = body

    if (!groupId) {
      return NextResponse.json(
        { error: 'ID gruppo obbligatorio' },
        { status: 400 }
      )
    }

    const group = await db.familyGroup.findUnique({
      where: { id: groupId },
      include: { members: true },
    })

    if (!group) {
      return NextResponse.json(
        { error: 'Gruppo non trovato' },
        { status: 404 }
      )
    }

    // Check if user is the owner
    if (group.ownerId === userId) {
      // If owner leaves, delete the group
      await db.familyGroup.delete({
        where: { id: groupId },
      })
      return NextResponse.json({ success: true, deleted: true })
    }

    // Remove user from group
    await db.familyMember.delete({
      where: {
        userId_groupId: {
          userId,
          groupId,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Leave group error:', error)
    return NextResponse.json(
      { error: 'Errore durante l\'uscita dal gruppo' },
      { status: 500 }
    )
  }
}
