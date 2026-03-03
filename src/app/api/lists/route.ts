import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/lists - Get lists for a group
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('groupId')

    if (!groupId) {
      return NextResponse.json({ error: 'GroupId è obbligatorio' }, { status: 400 })
    }

    // Check if user is member of the group
    const membership = await db.familyMember.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId,
        },
      },
    })

    if (!membership) {
      return NextResponse.json({ error: 'Non sei membro di questo gruppo' }, { status: 403 })
    }

    const lists = await db.list.findMany({
      where: { groupId },
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    })

    // Transform to match expected format with productCount
    const listsWithProductCount = lists.map((l) => ({
      id: l.id,
      name: l.name,
      icon: l.icon,
      color: l.color,
      groupId: l.groupId,
      createdById: l.createdById,
      sortOrder: l.sortOrder,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
      productCount: l._count.products,
    }))

    return NextResponse.json({ lists: listsWithProductCount })
  } catch (error) {
    console.error('Error fetching lists:', error)
    return NextResponse.json({ error: 'Errore durante il recupero delle liste' }, { status: 500 })
  }
}

// POST /api/lists - Create a new list
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const body = await request.json()
    const { name, groupId, icon, color } = body

    if (!name || !groupId) {
      return NextResponse.json({ error: 'Nome e gruppo sono obbligatori' }, { status: 400 })
    }

    // Check if user is member of the group
    const membership = await db.familyMember.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId,
        },
      },
    })

    if (!membership) {
      return NextResponse.json({ error: 'Non sei membro di questo gruppo' }, { status: 403 })
    }

    // Get max sortOrder
    const maxSortOrderList = await db.list.findFirst({
      where: { groupId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    })
    const sortOrder = (maxSortOrderList?.sortOrder ?? -1) + 1

    const list = await db.list.create({
      data: {
        name: name.trim(),
        icon: icon || null,
        color: color || null,
        groupId,
        createdById: userId,
        sortOrder,
      },
    })

    return NextResponse.json({ list })
  } catch (error) {
    console.error('Error creating list:', error)
    return NextResponse.json({ error: 'Errore durante la creazione della lista' }, { status: 500 })
  }
}
