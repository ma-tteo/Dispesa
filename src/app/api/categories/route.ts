import { NextRequest, NextResponse } from 'next/server'
import { query, execute, generateId } from '@/lib/db-turso'

interface Category {
  id: string
  name: string
  icon: string | null
  color: string | null
  createdAt: string
}

// GET /api/categories
export async function GET(request: NextRequest) {
  try {
    // Note: Categories are public (needed for registration/login flow)
    // But we still log for debugging
    const categories = await query<Category>(
      'SELECT * FROM Category ORDER BY name ASC'
    )

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
    const existing = await query<Category>(
      'SELECT id FROM Category WHERE name = ?',
      [name.trim()]
    )

    if (existing.length > 0) {
      return NextResponse.json({ error: 'Categoria già esistente' }, { status: 400 })
    }

    const id = generateId()
    const now = new Date().toISOString()

    await execute(
      'INSERT INTO Category (id, name, icon, color, createdAt) VALUES (?, ?, ?, ?, ?)',
      [id, name.trim(), icon || '📦', color || '#64748b', now]
    )

    const category: Category = {
      id,
      name: name.trim(),
      icon: icon || '📦',
      color: color || '#64748b',
      createdAt: now
    }

    return NextResponse.json({ category })
  } catch (error) {
    console.error('[API] Error creating category:', error)
    return NextResponse.json({ error: 'Errore durante la creazione della categoria' }, { status: 500 })
  }
}
