import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

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
      return NextResponse.json({ error: 'Lista non trovata' }, { status: 404 })
    }

    if (list.group.members.length === 0) {
      return NextResponse.json({ error: 'Non hai accesso a questa lista' }, { status: 403 })
    }

    // Fetch products with category and store data
    const products = await db.product.findMany({
      where: { listId },
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
      },
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    })

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
      return NextResponse.json({ error: 'Lista non trovata' }, { status: 404 })
    }

    if (list.group.members.length === 0) {
      return NextResponse.json({ error: 'Non hai accesso a questa lista' }, { status: 403 })
    }

    // Get max sortOrder
    const maxSortOrderProduct = await db.product.findFirst({
      where: { listId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    })
    const sortOrder = (maxSortOrderProduct?.sortOrder ?? -1) + 1

    const product = await db.product.create({
      data: {
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
      },
    })

    return NextResponse.json({ product })
  } catch (error) {
    console.error('[API] Error creating product:', error)
    return NextResponse.json({ error: 'Errore durante la creazione del prodotto' }, { status: 500 })
  }
}
