import { NextRequest, NextResponse } from 'next/server'
import { query, execute, generateId } from '@/lib/db-turso'

interface UserSettings {
  id: string
  userId: string
  theme: string
  primaryColor: string
  fontSize: string
  compactMode: boolean
  showPrices: boolean
  showImages: boolean
  defaultStoreId: string | null
  currency: string
  language: string
  notifications: boolean
  createdAt: string
  updatedAt: string
}

// GET /api/settings
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    let settings = await query<UserSettings>(
      'SELECT * FROM UserSettings WHERE userId = ?',
      [userId]
    )

    // Create default settings if not exists
    if (settings.length === 0) {
      const id = generateId()
      const now = new Date().toISOString()

      await execute(
        `INSERT INTO UserSettings (id, userId, theme, primaryColor, fontSize, compactMode, showPrices, showImages, defaultStoreId, currency, language, notifications, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, userId, 'light', 'mint', 'medium', 0, 1, 0, null, 'EUR', 'it', 1, now, now]
      )

      settings = await query<UserSettings>(
        'SELECT * FROM UserSettings WHERE userId = ?',
        [userId]
      )
    }

    return NextResponse.json({ settings: settings[0] || null })
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
    const updates = body

    // Check if settings exist
    const existing = await query<UserSettings>(
      'SELECT id FROM UserSettings WHERE userId = ?',
      [userId]
    )

    const now = new Date().toISOString()

    if (existing.length === 0) {
      // Create new settings
      const id = generateId()
      await execute(
        `INSERT INTO UserSettings (id, userId, theme, primaryColor, fontSize, compactMode, showPrices, showImages, defaultStoreId, currency, language, notifications, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          userId,
          updates.theme || 'light',
          updates.primaryColor || 'mint',
          updates.fontSize || 'medium',
          updates.compactMode ? 1 : 0,
          updates.showPrices !== false ? 1 : 0,
          updates.showImages ? 1 : 0,
          updates.defaultStoreId || null,
          updates.currency || 'EUR',
          updates.language || 'it',
          updates.notifications !== false ? 1 : 0,
          now,
          now
        ]
      )
    } else {
      // Update existing settings
      const setClauses: string[] = []
      const values: (string | number | null)[] = []

      const allowedFields = ['theme', 'primaryColor', 'fontSize', 'compactMode', 'showPrices', 'showImages', 'defaultStoreId', 'currency', 'language', 'notifications']

      for (const key of allowedFields) {
        if (updates[key] !== undefined) {
          setClauses.push(`${key} = ?`)
          if (key === 'compactMode' || key === 'showPrices' || key === 'showImages' || key === 'notifications') {
            values.push(updates[key] ? 1 : 0)
          } else {
            values.push(updates[key])
          }
        }
      }

      if (setClauses.length > 0) {
        setClauses.push('updatedAt = ?')
        values.push(now)
        values.push(userId)

        await execute(
          `UPDATE UserSettings SET ${setClauses.join(', ')} WHERE userId = ?`,
          values
        )
      }
    }

    const settings = await query<UserSettings>(
      'SELECT * FROM UserSettings WHERE userId = ?',
      [userId]
    )

    return NextResponse.json({ settings: settings[0] })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json({ error: 'Errore durante l\'aggiornamento delle impostazioni' }, { status: 500 })
  }
}
