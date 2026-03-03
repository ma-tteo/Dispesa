import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db-turso'

// Verify user has access to the product's list
async function verifyProductAccess(productId: string, userId: string) {
  const result = await db.execute({
    sql: `
      SELECT p.*, l.groupId, fm.id as membershipId
      FROM Product p
      INNER JOIN List l ON p.listId = l.id
      INNER JOIN FamilyGroup fg ON l.groupId = fg.id
      LEFT JOIN FamilyMember fm ON fm.groupId = fg.id AND fm.userId = ?
      WHERE p.id = ?
    `,
    args: [userId, productId],
  })

  if (result.rows.length === 0) {
    return { hasAccess: false, product: null, list: null }
  }

  const row = result.rows[0]
  const hasAccess = row.membershipId !== null

  const product = {
    id: row.id as string,
    name: row.name as string,
    categoryId: row.categoryId as string | null,
    storeId: row.storeId as string | null,
    forAllStores: Boolean(row.forAllStores),
    price: row.price !== null ? Number(row.price) : null,
    weight: row.weight as string | null,
    quantity: Number(row.quantity),
    imageUrl: row.imageUrl as string | null,
    status: row.status as string,
    notes: row.notes as string | null,
    listId: row.listId as string,
    createdById: row.createdById as string,
    sortOrder: Number(row.sortOrder),
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string,
  }

  const list = {
    groupId: row.groupId as string,
  }

  return { hasAccess, product, list }
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

    // Build update
    const updates: string[] = []
    const args: (string | number | null)[] = []

    if (name !== undefined) {
      updates.push('name = ?')
      args.push(name.trim())
    }
    if (categoryId !== undefined) {
      updates.push('categoryId = ?')
      args.push(categoryId || null)
    }
    if (listId !== undefined) {
      updates.push('listId = ?')
      args.push(listId)
    }
    if (storeId !== undefined) {
      updates.push('storeId = ?')
      args.push(storeId || null)
    }
    if (price !== undefined) {
      updates.push('price = ?')
      args.push(price ? parseFloat(price) : null)
    }
    if (weight !== undefined) {
      updates.push('weight = ?')
      args.push(weight || null)
    }
    if (quantity !== undefined) {
      updates.push('quantity = ?')
      args.push(quantity ? parseInt(quantity) : 1)
    }
    if (imageUrl !== undefined) {
      updates.push('imageUrl = ?')
      args.push(imageUrl || null)
    }
    if (notes !== undefined) {
      updates.push('notes = ?')
      args.push(notes || null)
    }
    if (status !== undefined) {
      updates.push('status = ?')
      args.push(status)
    }
    if (sortOrder !== undefined) {
      updates.push('sortOrder = ?')
      args.push(sortOrder)
    }

    if (updates.length > 0) {
      updates.push('updatedAt = ?')
      args.push(new Date().toISOString())
      args.push(id)

      await db.execute({
        sql: `UPDATE Product SET ${updates.join(', ')} WHERE id = ?`,
        args,
      })
    }

    // Fetch updated product with relations
    const updatedResult = await db.execute({
      sql: `
        SELECT 
          p.id, p.name, p.categoryId, p.storeId, p.forAllStores, p.price, p.weight, 
          p.quantity, p.imageUrl, p.status, p.notes, p.listId, p.createdById, 
          p.sortOrder, p.createdAt, p.updatedAt,
          c.id as catId, c.name as catName, c.icon as catIcon, c.color as catColor,
          s.id as storeId_, s.name as storeName, s.icon as storeIcon, s.color as storeColor,
          u.id as userId, u.name as userName, u.email as userEmail, u.avatar as userAvatar
        FROM Product p
        LEFT JOIN Category c ON p.categoryId = c.id
        LEFT JOIN Store s ON p.storeId = s.id
        LEFT JOIN User u ON p.createdById = u.id
        WHERE p.id = ?
      `,
      args: [id],
    })

    if (updatedResult.rows.length === 0) {
      return NextResponse.json({ product: null })
    }

    const row = updatedResult.rows[0]
    const updatedProduct = {
      id: row.id as string,
      name: row.name as string,
      categoryId: row.categoryId as string | null,
      storeId: row.storeId as string | null,
      forAllStores: Boolean(row.forAllStores),
      price: row.price !== null ? Number(row.price) : null,
      weight: row.weight as string | null,
      quantity: Number(row.quantity),
      imageUrl: row.imageUrl as string | null,
      status: row.status as string,
      notes: row.notes as string | null,
      listId: row.listId as string,
      createdById: row.createdById as string,
      sortOrder: Number(row.sortOrder),
      createdAt: row.createdAt as string,
      updatedAt: row.updatedAt as string,
      category: row.catId ? {
        id: row.catId as string,
        name: row.catName as string,
        icon: row.catIcon as string | null,
        color: row.catColor as string | null,
      } : null,
      store: row.storeId_ ? {
        id: row.storeId_ as string,
        name: row.storeName as string,
        icon: row.storeIcon as string | null,
        color: row.storeColor as string | null,
      } : null,
      createdBy: row.userId ? {
        id: row.userId as string,
        name: row.userName as string | null,
        email: row.userEmail as string,
        avatar: row.userAvatar as string | null,
      } : null,
    }

    return NextResponse.json({ product: updatedProduct })
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

    await db.execute({
      sql: 'DELETE FROM Product WHERE id = ?',
      args: [id],
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Delete product error:', error)
    return NextResponse.json({ error: 'Errore durante l\'eliminazione del prodotto' }, { status: 500 })
  }
}
