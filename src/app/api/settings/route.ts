import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db-turso'
import { nanoid } from 'nanoid'

// GET /api/settings
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const result = await db.execute({
      sql: 'SELECT * FROM UserSettings WHERE userId = ?',
      args: [userId],
    })

    let settings

    if (result.rows.length === 0) {
      // Create default settings if not exists
      const settingsId = nanoid()
      const now = new Date().toISOString()

      await db.execute({
        sql: `
          INSERT INTO UserSettings (
            id, userId, theme, primaryColor, fontSize, compactMode, 
            showPrices, showImages, defaultStoreId, currency, language, 
            notifications, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          settingsId, userId, 'light', 'mint', 'medium', 0,
          1, 0, null, 'EUR', 'it', 1, now, now
        ],
      })

      settings = {
        id: settingsId,
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
        createdAt: now,
        updatedAt: now,
      }
    } else {
      const row = result.rows[0]
      settings = {
        id: row.id as string,
        userId: row.userId as string,
        theme: row.theme as string,
        primaryColor: row.primaryColor as string,
        fontSize: row.fontSize as string,
        compactMode: Boolean(row.compactMode),
        showPrices: Boolean(row.showPrices),
        showImages: Boolean(row.showImages),
        defaultStoreId: row.defaultStoreId as string | null,
        currency: row.currency as string,
        language: row.language as string,
        notifications: Boolean(row.notifications),
        createdAt: row.createdAt as string,
        updatedAt: row.updatedAt as string,
      }
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

    // Check if settings exist
    const existingResult = await db.execute({
      sql: 'SELECT id FROM UserSettings WHERE userId = ?',
      args: [userId],
    })

    const now = new Date().toISOString()

    if (existingResult.rows.length === 0) {
      // Create new settings
      const settingsId = nanoid()

      await db.execute({
        sql: `
          INSERT INTO UserSettings (
            id, userId, theme, primaryColor, fontSize, compactMode, 
            showPrices, showImages, defaultStoreId, currency, language, 
            notifications, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          settingsId, userId,
          body.theme || 'light',
          body.primaryColor || 'mint',
          body.fontSize || 'medium',
          body.compactMode ? 1 : 0,
          body.showPrices ? 1 : 0,
          body.showImages ? 1 : 0,
          body.defaultStoreId || null,
          body.currency || 'EUR',
          body.language || 'it',
          body.notifications ? 1 : 0,
          now, now
        ],
      })

      const settings = {
        id: settingsId,
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
        createdAt: now,
        updatedAt: now,
      }

      return NextResponse.json({ settings })
    }

    // Update existing settings
    const updates: string[] = ['updatedAt = ?']
    const args: (string | number | null)[] = [now]

    if (body.theme !== undefined) {
      updates.push('theme = ?')
      args.push(body.theme)
    }
    if (body.primaryColor !== undefined) {
      updates.push('primaryColor = ?')
      args.push(body.primaryColor)
    }
    if (body.fontSize !== undefined) {
      updates.push('fontSize = ?')
      args.push(body.fontSize)
    }
    if (body.compactMode !== undefined) {
      updates.push('compactMode = ?')
      args.push(body.compactMode ? 1 : 0)
    }
    if (body.showPrices !== undefined) {
      updates.push('showPrices = ?')
      args.push(body.showPrices ? 1 : 0)
    }
    if (body.showImages !== undefined) {
      updates.push('showImages = ?')
      args.push(body.showImages ? 1 : 0)
    }
    if (body.defaultStoreId !== undefined) {
      updates.push('defaultStoreId = ?')
      args.push(body.defaultStoreId || null)
    }
    if (body.currency !== undefined) {
      updates.push('currency = ?')
      args.push(body.currency)
    }
    if (body.language !== undefined) {
      updates.push('language = ?')
      args.push(body.language)
    }
    if (body.notifications !== undefined) {
      updates.push('notifications = ?')
      args.push(body.notifications ? 1 : 0)
    }

    args.push(userId)

    await db.execute({
      sql: `UPDATE UserSettings SET ${updates.join(', ')} WHERE userId = ?`,
      args,
    })

    // Fetch updated settings
    const result = await db.execute({
      sql: 'SELECT * FROM UserSettings WHERE userId = ?',
      args: [userId],
    })

    const row = result.rows[0]
    const settings = {
      id: row.id as string,
      userId: row.userId as string,
      theme: row.theme as string,
      primaryColor: row.primaryColor as string,
      fontSize: row.fontSize as string,
      compactMode: Boolean(row.compactMode),
      showPrices: Boolean(row.showPrices),
      showImages: Boolean(row.showImages),
      defaultStoreId: row.defaultStoreId as string | null,
      currency: row.currency as string,
      language: row.language as string,
      notifications: Boolean(row.notifications),
      createdAt: row.createdAt as string,
      updatedAt: row.updatedAt as string,
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json({ error: 'Errore durante l\'aggiornamento delle impostazioni' }, { status: 500 })
  }
}
