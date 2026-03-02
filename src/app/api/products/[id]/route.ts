import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Update a product
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

    const product = await db.product.findUnique({
      where: { id },
      include: {
        list: {
          include: {
            group: { include: { members: true } },
          },
        },
      },
    })

    if (!product) {
      return NextResponse.json({ error: 'Prodotto non trovato' }, { status: 404 })
    }

    // Verify user is a member of the group
    const isMember = product.list.group.members.some((m) => m.userId === userId)
    if (!isMember) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      categoryId,
      listId,
      storeId,
      price,
      weight,
      quantity,
      imageUrl,
      notes,
      status,
      sortOrder,
    } = body

    const updatedProduct = await db.product.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name?.trim() }),
        ...(categoryId !== undefined && { categoryId: categoryId || null }),
        ...(listId !== undefined && { listId }),
        ...(storeId !== undefined && { storeId: storeId || null }),
        ...(price !== undefined && { price: price ? parseFloat(price) : null }),
        ...(weight !== undefined && { weight: weight || null }),
        ...(quantity !== undefined && { quantity: quantity ? parseInt(quantity) : 1 }),
        ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
        ...(notes !== undefined && { notes: notes || null }),
        ...(status !== undefined && { status }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
      include: {
        category: true,
        store: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    })

    return NextResponse.json({ product: updatedProduct })
  } catch (error) {
    console.error('Update product error:', error)
    return NextResponse.json({ error: 'Errore durante l\'aggiornamento del prodotto' }, { status: 500 })
  }
}

// Delete a product
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

    const product = await db.product.findUnique({
      where: { id },
      include: {
        list: {
          include: {
            group: { include: { members: true } },
          },
        },
      },
    })

    if (!product) {
      return NextResponse.json({ error: 'Prodotto non trovato' }, { status: 404 })
    }

    // Verify user is a member of the group
    const isMember = product.list.group.members.some((m) => m.userId === userId)
    if (!isMember) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    await db.product.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete product error:', error)
    return NextResponse.json({ error: 'Errore durante l\'eliminazione del prodotto' }, { status: 500 })
  }
}
