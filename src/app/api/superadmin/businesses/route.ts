import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// MINIMAL VERSION
export async function GET() {
  try {
    console.log('🔧 Superadmin API called')
    
    // Simple query
    const businesses = await db.business.findMany({
      orderBy: { createdAt: 'desc' }
    })

    console.log('📊 Businesses found:', businesses.length)

    return NextResponse.json({
      businesses: businesses.map(b => ({
        id: b.id,
        name: b.name,
        slug: b.slug,
        email: b.email,
        active: b.active
      })),
      count: businesses.length
    })
  } catch (error) {
    console.error('❌ Superadmin error:', error)
    return NextResponse.json({ 
      error: 'Error del servidor',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}