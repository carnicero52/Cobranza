import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// WITH ERROR HANDLING
export async function GET() {
  try {
    console.log('🔧 Superadmin API called')
    
    const businesses = await db.business.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        active: true,
        createdAt: true,
        _count: { select: { customers: true, invoices: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    console.log('📊 Businesses found:', businesses.length)

    const invoices = await db.invoice.findMany({
      where: { status: 'paid' },
      select: { total: true }
    })

    const totalRevenue = invoices.reduce((sum, i) => sum + Number(i.total), 0)

    return NextResponse.json({
      businesses: businesses.map(b => ({
        id: b.id,
        name: b.name,
        slug: b.slug,
        email: b.email,
        active: b.active,
        createdAt: b.createdAt.toISOString()
      })),
      stats: {
        totalBusinesses: businesses.length,
        activeBusinesses: businesses.filter(b => b.active).length,
        totalCustomers: businesses.reduce((sum, b) => sum + b._count.customers, 0),
        totalInvoices: businesses.reduce((sum, b) => sum + b._count.invoices, 0),
        totalRevenue
      }
    })
  } catch (error) {
    console.error('❌ Superadmin error:', error)
    return NextResponse.json({ 
      error: 'Error del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}