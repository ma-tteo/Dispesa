import { NextRequest, NextResponse } from 'next/server'
import { query, execute } from '@/lib/db-turso'

interface Product {
  id: string
  name: string
  categoryId: string | null
  storeId: string | null
  forAllStores: boolean
  price: number | null
  weight: string | null
  quantity: number
  imageUrl: string | null
  status: string
  notes: string | null
  listId: string
  createdById: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

interface ListWithGroup {
  id: string
  groupId: string
}

interface FamilyMember {
  userId: string
}

interface Category {
  id: string
  name: string
  icon: string | null
  color: string | null
}

interface Store {
  id: string
  name: string
  icon: string | null
  color: string | null
}

interface User {
  id: string
  name: string | null
  email: string
  avatar: string | null
}

// Verify user has access to the product's list
async function verifyProductAccess(productId: string, userId: string): Promise<{ hasAccess: boolean; product?: Product; list?: ListWithGroup }> {
  // Get product with list info
  const products = await query<Product & { listId: string; groupId: string }>(`
    SELECT p.*, l.groupId 
    FROM Product p 
    JOIN List l ON p.listId = l.id 
    WHERE p.id = ?
  `, [productId])

  if (products.length === 0) {
    return { hasAccess: false }
  }

  const product = products[0] as Product
  const list = { id: product.listId, groupId: (product as unknown as { groupId: string }).groupId }

  // Check if user is member of the group
  const members = await query<FamilyMember>(
    'SELECT userId FROM FamilyMember WHERE userId = ? AND groupId = ?',
    [userId, list.groupId]
  )

  return { hasAccess: members.length > 0, product, list }
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

    // Build update query dynamically
    const updates: string[] = []
    const values: (string | number | null)[] = []

    if (name !== undefined) {
      updates.push('name = ?')
      values.push(name.trim())
    }
    if (categoryId !== undefined) {
      updates.push('categoryId = ?')
      values.push(categoryId || null)
    }
    if (listId !== undefined) {
      updates.push('listId = ?')
      values.push(listId)
    }
    if (storeId !== undefined) {
      updates.push('storeId = ?')
      values.push(storeId || null)
    }
    if (price !== undefined) {
      updates.push('price = ?')
      values.push(price ? parseFloat(price) : null)
    }
    if (weight !== undefined) {
      updates.push('weight = ?')
      values.push(weight || null)
    }
    if (quantity !== undefined) {
      updates.push('quantity = ?')
      values.push(quantity ? parseInt(quantity) : 1)
    }
    if (imageUrl !== undefined) {
      updates.push('imageUrl = ?')
      values.push(imageUrl || null)
    }
    if (notes !== undefined) {
      updates.push('notes = ?')
      values.push(notes || null)
    }
    if (status !== undefined) {
      updates.push('status = ?')
      values.push(status)
    }
    if (sortOrder !== undefined) {
      updates.push('sortOrder = ?')
      values.push(sortOrder)
    }

    if (updates.length > 0) {
      updates.push('updatedAt = ?')
      values.push(new Date().toISOString())
      values.push(id)

      await execute(
        `UPDATE Product SET ${updates.join(', ')} WHERE id = ?`,
        values
      )
    }

    // Fetch updated product with relations
    const updatedProducts = await query<Product>(
      'SELECT * FROM Product WHERE id = ?',
      [id]
    )

    const updatedProduct = updatedProducts[0]

    // Fetch category if exists
    let category: Category | null = null
    if (updatedProduct.categoryId) {
      const categories = await query<Category>(
        'SELECT id, name, icon, color FROM Category WHERE id = ?',
        [updatedProduct.categoryId]
      )
      category = categories[0] || null
    }

    // Fetch store if exists
    let store: Store | null = null
    if (updatedProduct.storeId) {
      const stores = await query<Store>(
        'SELECT id, name, icon, color FROM Store WHERE id = ?',
        [updatedProduct.storeId]
      )
      store = stores[0] || null
    }

    // Fetch created by user
    const users = await query<User>(
      'SELECT id, name, email, avatar FROM User WHERE id = ?',
      [updatedProduct.createdById]
    )
    const createdBy = users[0] || null

    return NextResponse.json({
      product: {
        ...updatedProduct,
        category,
        store,
        createdBy,
      }
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

    await execute('DELETE FROM Product WHERE id = ?', [id])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Delete product error:', error)
    return NextResponse.json({ error: 'Errore durante l\'eliminazione del prodotto' }, { status: 500 })
  }
}
