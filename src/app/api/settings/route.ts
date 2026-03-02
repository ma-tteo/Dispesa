import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Get user settings
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
          currency: 'EUR',
          language: 'it',
          notifications: true,
        },
      })
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Get settings error:', error)
    return NextResponse.json({ error: 'Errore durante il recupero delle impostazioni' }, { status: 500 })
  }
}

// Update user settings
export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const body = await request.json()
    const {
      theme,
      primaryColor,
      fontSize,
      compactMode,
      showPrices,
      showImages,
      defaultStoreId,
      currency,
      language,
      notifications,
    } = body

    const settings = await db.userSettings.upsert({
      where: { userId },
      update: {
        theme: theme || undefined,
        primaryColor: primaryColor || undefined,
        fontSize: fontSize || undefined,
        compactMode: compactMode !== undefined ? compactMode : undefined,
        showPrices: showPrices !== undefined ? showPrices : undefined,
        showImages: showImages !== undefined ? showImages : undefined,
        defaultStoreId: defaultStoreId || null,
        currency: currency || undefined,
        language: language || undefined,
        notifications: notifications !== undefined ? notifications : undefined,
      },
      create: {
        userId,
        theme: theme || 'light',
        primaryColor: primaryColor || 'mint',
        fontSize: fontSize || 'medium',
        compactMode: compactMode || false,
        showPrices: showPrices !== false,
        showImages: showImages || false,
        defaultStoreId: defaultStoreId || null,
        currency: currency || 'EUR',
        language: language || 'it',
        notifications: notifications !== false,
      },
    })

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Update settings error:', error)
    return NextResponse.json({ error: 'Errore durante l\'aggiornamento delle impostazioni' }, { status: 500 })
  }
}
