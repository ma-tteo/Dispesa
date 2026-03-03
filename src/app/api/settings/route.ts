import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/settings
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    let settings = await db.userSettings.findUnique({
      where: { userId },
    })

    // Create default settings if not exists
    if (!settings) {
      settings = await db.userSettings.create({
        data: {
          userId,
          theme: 'light',
          primaryColor: 'mint',
          fontSize: 'medium',
          compactMode: false,
          showPrices: true,
          showImages: false,
          defaultStoreId: null,
          currency: 'EUR',
          language: 'it',
          notifications: true,
        },
      })
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ error: 'Errore durante il recupero delle impostazioni' }, { status: 500 })
  }
}

// PUT /api/settings
export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const body = await request.json()

    // Use upsert to either create or update settings
    const settings = await db.userSettings.upsert({
      where: { userId },
      create: {
        userId,
        theme: body.theme || 'light',
        primaryColor: body.primaryColor || 'mint',
        fontSize: body.fontSize || 'medium',
        compactMode: body.compactMode ?? false,
        showPrices: body.showPrices ?? true,
        showImages: body.showImages ?? false,
        defaultStoreId: body.defaultStoreId || null,
        currency: body.currency || 'EUR',
        language: body.language || 'it',
        notifications: body.notifications ?? true,
      },
      update: {
        ...(body.theme !== undefined && { theme: body.theme }),
        ...(body.primaryColor !== undefined && { primaryColor: body.primaryColor }),
        ...(body.fontSize !== undefined && { fontSize: body.fontSize }),
        ...(body.compactMode !== undefined && { compactMode: body.compactMode }),
        ...(body.showPrices !== undefined && { showPrices: body.showPrices }),
        ...(body.showImages !== undefined && { showImages: body.showImages }),
        ...(body.defaultStoreId !== undefined && { defaultStoreId: body.defaultStoreId || null }),
        ...(body.currency !== undefined && { currency: body.currency }),
        ...(body.language !== undefined && { language: body.language }),
        ...(body.notifications !== undefined && { notifications: body.notifications }),
      },
    })

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json({ error: 'Errore durante l\'aggiornamento delle impostazioni' }, { status: 500 })
  }
}
