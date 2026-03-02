import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Get lists for a group
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('groupId')

    if (!groupId) {
      return NextResponse.json({ error: 'ID gruppo obbligatorio' }, { status: 400 })
    }

    // Verify user is a member of the group
    const membership = await db.familyMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    })

    if (!membership) {
      return NextResponse.json({ error: 'Non sei membro di questo gruppo' }, { status: 403 })
    }

    const lists = await db.list.findMany({
      where: { groupId },
      include: {
        _count: { select: { products: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { sortOrder: 'asc' },
    })

    return NextResponse.json({ lists })
  } catch (error) {
    console.error('Get lists error:', error)
    return NextResponse.json({ error: 'Errore durante il recupero delle liste' }, { status: 500 })
  }
}

// Create a new list
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const body = await request.json()
    const { name, icon, color, groupId } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Il nome della lista è obbligatorio' }, { status: 400 })
    }

    if (!groupId) {
      return NextResponse.json({ error: 'ID gruppo obbligatorio' }, { status: 400 })
    }

    // Verify user is a member of the group
    const membership = await db.familyMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    })

    if (!membership) {
      return NextResponse.json({ error: 'Non sei membro di questo gruppo' }, { status: 403 })
    }

    // Get max sortOrder
    const maxSort = await db.list.findFirst({
      where: { groupId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    })

    const list = await db.list.create({
      data: {
        name: name.trim(),
        icon: icon || null,
        color: color || null,
        groupId,
        createdById: userId,
        sortOrder: (maxSort?.sortOrder || 0) + 1,
      },
      include: {
        _count: { select: { products: true } },
        createdBy: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ list })
  } catch (error) {
    console.error('Create list error:', error)
    return NextResponse.json({ error: 'Errore durante la creazione della lista' }, { status: 500 })
  }
}
