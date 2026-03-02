import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

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

    const list = await db.list.findUnique({
      where: { id },
      include: { group: { include: { members: true } } },
    })

    if (!list) {
      return NextResponse.json({ error: 'Lista non trovata' }, { status: 404 })
    }

    // Verify user is a member of the group
    const isMember = list.group.members.some((m) => m.userId === userId)
    if (!isMember) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    const body = await request.json()
    const { name, icon, color, sortOrder } = body

    const updatedList = await db.list.update({
      where: { id },
      data: {
        name: name?.trim(),
        icon: icon !== undefined ? icon : undefined,
        color: color !== undefined ? color : undefined,
        sortOrder: sortOrder !== undefined ? sortOrder : undefined,
      },
      include: {
        _count: { select: { products: true } },
        createdBy: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ list: updatedList })
  } catch (error) {
    console.error('Update list error:', error)
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

    const list = await db.list.findUnique({
      where: { id },
      include: { group: { include: { members: true } } },
    })

    if (!list) {
      return NextResponse.json({ error: 'Lista non trovata' }, { status: 404 })
    }

    // Verify user is a member of the group
    const isMember = list.group.members.some((m) => m.userId === userId)
    if (!isMember) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    // Delete all products in the list first (cascade)
    await db.product.deleteMany({ where: { listId: id } })
    
    // Delete the list
    await db.list.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete list error:', error)
    return NextResponse.json({ error: 'Errore durante l\'eliminazione della lista' }, { status: 500 })
  }
}
