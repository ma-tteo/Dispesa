import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db-turso'

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
    const categories = await query<Category>(
      'SELECT * FROM Category ORDER BY name ASC'
    )

    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json({ error: 'Errore durante il recupero delle categorie' }, { status: 500 })
  }
}
