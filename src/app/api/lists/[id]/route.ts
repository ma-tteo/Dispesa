import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Verify user has access to the list's group
async function verifyListAccess(listId: string, userId: string) {
  const list = await db.list.findUnique({
    where: { id: listId },
    include: {
      group: {
        include: {
          members: {
            where: { userId },
          },
        },
      },
    },
  })

  if (!list) {
    return { hasAccess: false, list: null }
  }

  const hasAccess = list.group.members.length > 0
  return { hasAccess, list }
}

// Update a list
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id')
    const { id } = await params

    if (!userId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { hasAccess, list } = await verifyListAccess(id, userId)

    if (!hasAccess || !list) {
      return NextResponse.json({ error: 'Lista non trovata o non autorizzato' }, { status: 404 })
    }

    const body = await request.json()
    const { name, icon, color, sortOrder } = body

    // Build update data
    const updateData: {
      name?: string
      icon?: string | null
      color?: string | null
      sortOrder?: number
    } = {}

    if (name !== undefined) {
      updateData.name = name.trim()
    }
    if (icon !== undefined) {
      updateData.icon = icon || null
    }
    if (color !== undefined) {
      updateData.color = color || null
    }
    if (sortOrder !== undefined) {
      updateData.sortOrder = sortOrder
    }

    // Update the list
    if (Object.keys(updateData).length > 0) {
      await db.list.update({
        where: { id },
        data: updateData,
      })
    }

    // Fetch updated list with product count and created by user
    const updatedList = await db.list.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Transform to match expected format
    const result = updatedList
      ? {
          id: updatedList.id,
          name: updatedList.name,
          icon: updatedList.icon,
          color: updatedList.color,
          groupId: updatedList.groupId,
          createdById: updatedList.createdById,
          sortOrder: updatedList.sortOrder,
          createdAt: updatedList.createdAt,
          updatedAt: updatedList.updatedAt,
          productCount: updatedList._count.products,
          createdBy: updatedList.createdBy,
        }
      : null

    return NextResponse.json({ list: result })
  } catch (error) {
    console.error('[API] Update list error:', error)
    return NextResponse.json({ error: 'Errore durante l\'aggiornamento della lista' }, { status: 500 })
  }
}

// Delete a list
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id')
    const { id } = await params

    if (!userId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { hasAccess, list } = await verifyListAccess(id, userId)

    if (!hasAccess || !list) {
      return NextResponse.json({ error: 'Lista non trovata o non autorizzato' }, { status: 404 })
    }

    // Delete the list (cascade will delete products automatically via Prisma schema)
    await db.list.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Delete list error:', error)
    return NextResponse.json({ error: 'Errore durante l\'eliminazione della lista' }, { status: 500 })
  }
}
