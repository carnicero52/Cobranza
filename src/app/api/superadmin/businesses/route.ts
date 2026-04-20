import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// SIMPLE VERSION - Just list businesses
export async function GET() {
  try {
    const businesses = await db.business.findMany({
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      businesses: businesses.map(b => ({
        id: b.id,
        name: b.name,
        slug: b.slug,
        email: b.email,
        active: b.active
      }))
    })
  } catch (error) {
    console.error('❌ Superadmin error:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}