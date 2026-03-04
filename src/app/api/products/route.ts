import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db-turso'
import { nanoid } from 'nanoid'
import { broadcastProductChange } from '@/lib/pusher-server'

// Constants
const MAX_PRODUCT_NAME_LENGTH = 200
const MAX_NOTES_LENGTH = 500

// GET /api/products - Get products for a list with joined category/store data
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const listId = searchParams.get('listId')

    if (!listId) {
      return NextResponse.json({ error: 'ListId è obbligatorio' }, { status: 400 })
    }

    // Validate listId format (prevent injection)
    if (listId.length > 50 || !/^[a-zA-Z0-9_-]+$/.test(listId)) {
      return NextResponse.json({ error: 'ListId non valido' }, { status: 400 })
    }

    // Verify list exists and user has access
    const accessResult = await db.execute({
      sql: `
        SELECT l.id
        FROM List l
        INNER JOIN FamilyGroup fg ON l.groupId = fg.id
        INNER JOIN FamilyMember fm ON fm.groupId = fg.id AND fm.userId = ?
        WHERE l.id = ?
      `,
      args: [userId, listId],
    })

    if (accessResult.rows.length === 0) {
      return NextResponse.json({ error: 'Lista non trovata o non hai accesso' }, { status: 403 })
    }

    // Fetch products with category and store data
    const productsResult = await db.execute({
      sql: `
        SELECT 
          p.id, p.name, p.categoryId, p.storeId, p.forAllStores, p.price, p.weight, 
          p.quantity, p.imageUrl, p.status, p.notes, p.listId, p.createdById, 
          p.sortOrder, p.createdAt, p.updatedAt,
          c.id as catId, c.name as catName, c.icon as catIcon, c.color as catColor,
          s.id as storeId_, s.name as storeName, s.icon as storeIcon, s.color as storeColor
        FROM Product p
        LEFT JOIN Category c ON p.categoryId = c.id
        LEFT JOIN Store s ON p.storeId = s.id
        WHERE p.listId = ?
        ORDER BY p.sortOrder ASC, p.createdAt DESC
      `,
      args: [listId],
    })

    const products = productsResult.rows.map((row) => ({
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
    }))

    return NextResponse.json({ products })
  } catch (error) {
    console.error('[API] Error fetching products:', error)
    return NextResponse.json({ error: 'Errore durante il recupero dei prodotti' }, { status: 500 })
  }
}

// POST /api/products - Create a new product
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const body = await request.json()
    const { name, listId, categoryId, storeId, forAllStores, price, weight, quantity, imageUrl, notes } = body

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Il nome del prodotto è obbligatorio' }, { status: 400 })
    }

    if (!listId) {
      return NextResponse.json({ error: 'La lista è obbligatoria' }, { status: 400 })
    }

    // Sanitize inputs
    const sanitizedName = name.trim().slice(0, MAX_PRODUCT_NAME_LENGTH)
    const sanitizedNotes = notes?.trim().slice(0, MAX_NOTES_LENGTH) || null

    // Validate quantity
    const sanitizedQuantity = Math.max(1, Math.min(999, parseInt(quantity) || 1))

    // Validate price
    const sanitizedPrice = price !== null && price !== undefined ?
      Math.max(0, Math.min(999999.99, parseFloat(price) || 0)) : null

    // Verify list exists and user has access
    const accessResult = await db.execute({
      sql: `
        SELECT l.id, l.groupId
        FROM List l
        INNER JOIN FamilyGroup fg ON l.groupId = fg.id
        INNER JOIN FamilyMember fm ON fm.groupId = fg.id AND fm.userId = ?
        WHERE l.id = ?
      `,
      args: [userId, listId],
    })

    if (accessResult.rows.length === 0) {
      return NextResponse.json({ error: 'Lista non trovata o non hai accesso' }, { status: 403 })
    }

    const groupId = accessResult.rows[0].groupId as string

    // Get max sortOrder
    const maxSortResult = await db.execute({
      sql: 'SELECT MAX(sortOrder) as maxSort FROM Product WHERE listId = ?',
      args: [listId],
    })

    const sortOrder = (Number(maxSortResult.rows[0]?.maxSort ?? -1)) + 1

    const productId = nanoid()
    const now = new Date().toISOString()

    await db.execute({
      sql: `
        INSERT INTO Product (
          id, name, categoryId, storeId, forAllStores, price, weight, 
          quantity, imageUrl, status, notes, listId, createdById, sortOrder, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        productId, sanitizedName, categoryId || null, storeId || null,
        forAllStores ? 1 : 0, sanitizedPrice, weight || null,
        sanitizedQuantity, imageUrl || null, 'TO_BUY', sanitizedNotes,
        listId, userId, sortOrder, now, now
      ],
    })

    const product = {
      id: productId,
      name: sanitizedName,
      categoryId: categoryId || null,
      storeId: storeId || null,
      forAllStores: forAllStores || false,
      price: sanitizedPrice,
      weight: weight || null,
      quantity: sanitizedQuantity,
      imageUrl: imageUrl || null,
      status: 'TO_BUY',
      notes: sanitizedNotes,
      listId,
      createdById: userId,
      sortOrder,
      createdAt: now,
      updatedAt: now,
    }

    // Broadcast to Pusher for real-time updates
    await broadcastProductChange(groupId, {
      action: 'create',
      productId,
      productName: sanitizedName,
      userId,
    })

    return NextResponse.json({ product })
  } catch (error) {
    console.error('[API] Error creating product:', error)
    return NextResponse.json({ error: 'Errore durante la creazione del prodotto' }, { status: 500 })
  }
}
