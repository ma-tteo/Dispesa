import { NextRequest, NextResponse } from 'next/server'

// Constants
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB (reduced from 5MB)
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

// Upload image and return base64 data URL
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Nessun file caricato' }, { status: 400 })
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Formato non supportato. Usa JPEG, PNG, GIF o WebP' 
      }, { status: 400 })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: `L'immagine deve essere inferiore a ${MAX_FILE_SIZE / 1024 / 1024}MB` 
      }, { status: 400 })
    }

    // Convert to base64
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString('base64')
    const dataUrl = `data:${file.type};base64,${base64}`

    return NextResponse.json({ 
      imageUrl: dataUrl,
      success: true 
    })
  } catch (error) {
    console.error('[API] Upload error:', error)
    return NextResponse.json({ error: 'Errore durante il caricamento' }, { status: 500 })
  }
}
