import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db-turso'
import { nanoid } from 'nanoid'

// GET /api/categories
export async function GET(request: NextRequest) {
  try {
    // Note: Categories are public (needed for registration/login flow)
    // But we still log for debugging
    const result = await db.execute({
      sql: 'SELECT * FROM Category ORDER BY name ASC',
      args: [],
    })

    const categories = result.rows.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      icon: row.icon as string | null,
      color: row.color as string | null,
      createdAt: row.createdAt as string,
    }))

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
    const existingResult = await db.execute({
      sql: 'SELECT id FROM Category WHERE name = ?',
      args: [name.trim()],
    })

    if (existingResult.rows.length > 0) {
      return NextResponse.json({ error: 'Categoria già esistente' }, { status: 400 })
    }

    const categoryId = nanoid()
    const now = new Date().toISOString()

    await db.execute({
      sql: 'INSERT INTO Category (id, name, icon, color, createdAt) VALUES (?, ?, ?, ?, ?)',
      args: [categoryId, name.trim(), icon || '📦', color || '#64748b', now],
    })

    const category = {
      id: categoryId,
      name: name.trim(),
      icon: icon || '📦',
      color: color || '#64748b',
      createdAt: now,
    }

    return NextResponse.json({ category })
  } catch (error) {
    console.error('[API] Error creating category:', error)
    return NextResponse.json({ error: 'Errore durante la creazione della categoria' }, { status: 500 })
  }
}
