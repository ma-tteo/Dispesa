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
}

interface List {
  id: string
  groupId: string
}

interface FamilyMember {
  userId: string
  groupId: string
}

// GET /api/products - Get products for a list
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

    const products = await query<Product>(
      'SELECT * FROM Product WHERE listId = ? ORDER BY sortOrder ASC, createdAt DESC',
      [listId]
    )

    return NextResponse.json({ products })
  } catch (error) {
    console.error('Error fetching products:', error)
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

    if (!name || !listId) {
      return NextResponse.json({ error: 'Nome e lista sono obbligatori' }, { status: 400 })
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
      [id, name.trim(), categoryId || null, storeId || null, forAllStores ? 1 : 0, price || null, weight || null, quantity || 1, imageUrl || null, 'TO_BUY', notes || null, listId, userId, sortOrder, now, now]
    )

    const product: Product = {
      id,
      name: name.trim(),
      categoryId: categoryId || null,
      storeId: storeId || null,
      forAllStores: forAllStores || false,
      price: price || null,
      weight: weight || null,
      quantity: quantity || 1,
      imageUrl: imageUrl || null,
      status: 'TO_BUY',
      notes: notes || null,
      listId,
      createdById: userId,
      sortOrder,
      createdAt: now,
      updatedAt: now
    }

    return NextResponse.json({ product })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json({ error: 'Errore durante la creazione del prodotto' }, { status: 500 })
  }
}
