import { NextRequest, NextResponse } from 'next/server'
import { query, execute, generateId } from '@/lib/db-turso'

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
  // Joined data
  category?: { id: string; name: string; icon: string | null; color: string | null } | null
  store?: { id: string; name: string; icon: string | null; color: string | null } | null
}

interface List {
  id: string
  groupId: string
}

interface FamilyMember {
  userId: string
  groupId: string
}

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
    const lists = await query<List>('SELECT id, groupId FROM List WHERE id = ?', [listId])
    if (lists.length === 0) {
      return NextResponse.json({ error: 'Lista non trovata' }, { status: 404 })
    }

    const list = lists[0]
    const members = await query<FamilyMember>(
      'SELECT userId FROM FamilyMember WHERE userId = ? AND groupId = ?',
      [userId, list.groupId]
    )

    if (members.length === 0) {
      return NextResponse.json({ error: 'Non hai accesso a questa lista' }, { status: 403 })
    }

    // Fetch products with category and store data (optimized single query)
    const products = await query<Product>(`
      SELECT 
        p.*,
        c.id as 'category.id', c.name as 'category.name', c.icon as 'category.icon', c.color as 'category.color',
        s.id as 'store.id', s.name as 'store.name', s.icon as 'store.icon', s.color as 'store.color'
      FROM Product p
      LEFT JOIN Category c ON p.categoryId = c.id
      LEFT JOIN Store s ON p.storeId = s.id
      WHERE p.listId = ?
      ORDER BY p.sortOrder ASC, p.createdAt DESC
    `, [listId])

    // Transform flat results to nested objects
    const transformedProducts = products.map(p => ({
      ...p,
      category: p.categoryId ? {
        id: (p as unknown as Record<string, string>)['category.id'],
        name: (p as unknown as Record<string, string>)['category.name'],
        icon: (p as unknown as Record<string, string>)['category.icon'],
        color: (p as unknown as Record<string, string>)['category.color'],
      } : null,
      store: p.storeId ? {
        id: (p as unknown as Record<string, string>)['store.id'],
        name: (p as unknown as Record<string, string>)['store.name'],
        icon: (p as unknown as Record<string, string>)['store.icon'],
        color: (p as unknown as Record<string, string>)['store.color'],
      } : null,
    }))

    return NextResponse.json({ products: transformedProducts })
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
    const lists = await query<List>('SELECT id, groupId FROM List WHERE id = ?', [listId])
    if (lists.length === 0) {
      return NextResponse.json({ error: 'Lista non trovata' }, { status: 404 })
    }

    const list = lists[0]
    const members = await query<FamilyMember>(
      'SELECT userId FROM FamilyMember WHERE userId = ? AND groupId = ?',
      [userId, list.groupId]
    )

    if (members.length === 0) {
      return NextResponse.json({ error: 'Non hai accesso a questa lista' }, { status: 403 })
    }

    // Get max sortOrder
    const maxOrder = await query<{ max: number }>(
      'SELECT COALESCE(MAX(sortOrder), -1) as max FROM Product WHERE listId = ?',
      [listId]
    )
    const sortOrder = (maxOrder[0]?.max ?? -1) + 1

    const id = generateId()
    const now = new Date().toISOString()

    await execute(
      `INSERT INTO Product (id, name, categoryId, storeId, forAllStores, price, weight, quantity, imageUrl, status, notes, listId, createdById, sortOrder, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, sanitizedName, categoryId || null, storeId || null, forAllStores ? 1 : 0, sanitizedPrice, weight || null, sanitizedQuantity, imageUrl || null, 'TO_BUY', sanitizedNotes, listId, userId, sortOrder, now, now]
    )

    const product: Product = {
      id,
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
      updatedAt: now
    }

    return NextResponse.json({ product })
  } catch (error) {
    console.error('[API] Error creating product:', error)
    return NextResponse.json({ error: 'Errore durante la creazione del prodotto' }, { status: 500 })
  }
}
