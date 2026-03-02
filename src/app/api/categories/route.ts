import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const categories = await db.category.findMany({
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Get categories error:', error)
    return NextResponse.json(
      { error: 'Errore durante il recupero delle categorie' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const body = await request.json()
    const { name, icon, color } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Il nome della categoria è obbligatorio' }, { status: 400 })
    }

    // Check if category already exists
    const existing = await db.category.findUnique({
      where: { name: name.trim() }
    })

    if (existing) {
      return NextResponse.json({ error: 'Questa categoria esiste già' }, { status: 400 })
    }

    const category = await db.category.create({
      data: {
        name: name.trim(),
        icon: icon || '📦',
        color: color || '#64748b',
      }
    })

    return NextResponse.json({ category })
  } catch (error) {
    console.error('Create category error:', error)
    return NextResponse.json({ error: 'Errore durante la creazione della categoria' }, { status: 500 })
  }
}
