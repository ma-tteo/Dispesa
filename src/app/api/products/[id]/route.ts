import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Verify user has access to the product's list
async function verifyProductAccess(productId: string, userId: string) {
  const product = await db.product.findUnique({
    where: { id: productId },
    include: {
      list: {
        include: {
          group: {
            include: {
              members: {
                where: { userId },
              },
            },
          },
        },
      },
    },
  })

  if (!product) {
    return { hasAccess: false, product: null, list: null }
  }

  const hasAccess = product.list.group.members.length > 0
  return { hasAccess, product, list: product.list }
}

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

    const { hasAccess, product } = await verifyProductAccess(id, userId)

    if (!hasAccess || !product) {
      return NextResponse.json({ error: 'Prodotto non trovato o non autorizzato' }, { status: 404 })
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

    // Build update data
    const updateData: {
      name?: string
      categoryId?: string | null
      listId?: string
      storeId?: string | null
      price?: number | null
      weight?: string | null
      quantity?: number
      imageUrl?: string | null
      notes?: string | null
      status?: string
      sortOrder?: number
    } = {}

    if (name !== undefined) {
      updateData.name = name.trim()
    }
    if (categoryId !== undefined) {
      updateData.categoryId = categoryId || null
    }
    if (listId !== undefined) {
      updateData.listId = listId
    }
    if (storeId !== undefined) {
      updateData.storeId = storeId || null
    }
    if (price !== undefined) {
      updateData.price = price ? parseFloat(price) : null
    }
    if (weight !== undefined) {
      updateData.weight = weight || null
    }
    if (quantity !== undefined) {
      updateData.quantity = quantity ? parseInt(quantity) : 1
    }
    if (imageUrl !== undefined) {
      updateData.imageUrl = imageUrl || null
    }
    if (notes !== undefined) {
      updateData.notes = notes || null
    }
    if (status !== undefined) {
      updateData.status = status
    }
    if (sortOrder !== undefined) {
      updateData.sortOrder = sortOrder
    }

    // Update product
    if (Object.keys(updateData).length > 0) {
      await db.product.update({
        where: { id },
        data: updateData,
      })
    }

    // Fetch updated product with relations
    const updatedProduct = await db.product.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
          },
        },
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

    return NextResponse.json({
      product: updatedProduct,
    })
  } catch (error) {
    console.error('[API] Update product error:', error)
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

    const { hasAccess, product } = await verifyProductAccess(id, userId)

    if (!hasAccess || !product) {
      return NextResponse.json({ error: 'Prodotto non trovato o non autorizzato' }, { status: 404 })
    }

    await db.product.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Delete product error:', error)
    return NextResponse.json({ error: 'Errore durante l\'eliminazione del prodotto' }, { status: 500 })
  }
}
