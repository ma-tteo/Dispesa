import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Get products for a list
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const listId = searchParams.get('listId')
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const store = searchParams.get('store')
    const search = searchParams.get('search')

    if (!listId) {
      return NextResponse.json({ error: 'ID lista obbligatorio' }, { status: 400 })
    }

    // Verify user has access to the list
    const list = await db.list.findUnique({
      where: { id: listId },
      include: {
        group: {
          include: { members: true },
        },
      },
    })

    if (!list) {
      return NextResponse.json({ error: 'Lista non trovata' }, { status: 404 })
    }

    const isMember = list.group.members.some((m) => m.userId === userId)
    if (!isMember) {
      return NextResponse.json({ error: 'Non hai accesso a questa lista' }, { status: 403 })
    }

    const where: {
      listId: string
      status?: 'TO_BUY' | 'COMPLETED'
      categoryId?: string
      storeId?: string
      name?: { contains: string; mode: 'insensitive' }
    } = { listId }

    if (status && (status === 'TO_BUY' || status === 'COMPLETED')) {
      where.status = status
    }

    if (category) {
      where.categoryId = category
    }

    if (store) {
      where.storeId = store
    }

    if (search) {
      where.name = { contains: search, mode: 'insensitive' }
    }

    const products = await db.product.findMany({
      where,
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
      orderBy: [
        { status: 'asc' },
        { sortOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    })

    // Calculate total
    const total = products.reduce((sum, p) => sum + (p.price || 0) * p.quantity, 0)

    return NextResponse.json({ products, total })
  } catch (error) {
    console.error('Get products error:', error)
    return NextResponse.json({ error: 'Errore durante il recupero dei prodotti' }, { status: 500 })
  }
}

// Create a new product
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      categoryId,
      storeId,
      price,
      weight,
      quantity,
      imageUrl,
      notes,
      listId,
    } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Il nome del prodotto è obbligatorio' }, { status: 400 })
    }

    if (!listId) {
      return NextResponse.json({ error: 'ID lista obbligatorio' }, { status: 400 })
    }

    // Category is optional - can be null if not provided
    const finalCategoryId = categoryId || null

    // Verify user has access to the list
    const list = await db.list.findUnique({
      where: { id: listId },
      include: {
        group: {
          include: { members: true },
        },
      },
    })

    if (!list) {
      return NextResponse.json({ error: 'Lista non trovata' }, { status: 404 })
    }

    const isMember = list.group.members.some((m) => m.userId === userId)
    if (!isMember) {
      return NextResponse.json({ error: 'Non hai accesso a questa lista' }, { status: 403 })
    }

    // Get max sortOrder
    const maxSort = await db.product.findFirst({
      where: { listId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    })

    const product = await db.product.create({
      data: {
        name: name.trim(),
        categoryId: finalCategoryId,
        storeId: storeId || null,
        price: price ? parseFloat(price) : null,
        weight: weight || null,
        quantity: quantity ? parseInt(quantity) : 1,
        imageUrl: imageUrl || null,
        notes: notes || null,
        listId,
        createdById: userId,
        sortOrder: (maxSort?.sortOrder || 0) + 1,
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

    return NextResponse.json({ product })
  } catch (error) {
    console.error('Create product error:', error)
    return NextResponse.json({ error: 'Errore durante la creazione del prodotto' }, { status: 500 })
  }
}
