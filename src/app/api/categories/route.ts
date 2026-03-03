import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/categories
export async function GET(request: NextRequest) {
  try {
    // Note: Categories are public (needed for registration/login flow)
    // But we still log for debugging
    const categories = await db.category.findMany({
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ categories })
  } catch (error) {
    console.error('[API] Error fetching categories:', error)
    return NextResponse.json({ error: 'Errore durante il recupero delle categorie' }, { status: 500 })
  }
}

// POST /api/categories - Create a new category (requires auth)
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const body = await request.json()
    const { name, icon, color } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Nome categoria obbligatorio' }, { status: 400 })
    }

    // Check if category already exists
    const existing = await db.category.findUnique({
      where: { name: name.trim() },
    })

    if (existing) {
      return NextResponse.json({ error: 'Categoria già esistente' }, { status: 400 })
    }

    const category = await db.category.create({
      data: {
        name: name.trim(),
        icon: icon || '📦',
        color: color || '#64748b',
      },
    })

    return NextResponse.json({ category })
  } catch (error) {
    console.error('[API] Error creating category:', error)
    return NextResponse.json({ error: 'Errore durante la creazione della categoria' }, { status: 500 })
  }
}
