import { NextRequest, NextResponse } from 'next/server'

// Upload image and return base64 data URL
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Nessun file caricato' }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Il file deve essere un\'immagine' }, { status: 400 })
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'L\'immagine deve essere inferiore a 5MB' }, { status: 400 })
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
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Errore durante il caricamento' }, { status: 500 })
  }
}
