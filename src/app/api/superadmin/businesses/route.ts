import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// SIMPLE VERSION - Avoid complex queries
export async function GET() {
  try {
    console.log('🔧 Superadmin API called')
    
    const businesses = await db.business.findMany({
      orderBy: { createdAt: 'desc' }
    })

    // Get counts separately
    const allCustomers = await db.customer.findMany({ select: { businessId: true } })
    const allInvoices = await db.invoice.findMany({ select: { businessId: true, amount: true, status: true } })

    // Map counts by businessId
    const customerCounts: Record<string, number> = {}
    const invoiceCounts: Record<string, number> = {}
    const revenueByBusiness: Record<string, number> = {}

    for (const c of allCustomers) {
      customerCounts[c.businessId] = (customerCounts[c.businessId] || 0) + 1
    }
    for (const i of allInvoices) {
      invoiceCounts[i.businessId] = (invoiceCounts[i.businessId] || 0) + 1
      if (i.status === 'paid') {
        revenueByBusiness[i.businessId] = (revenueByBusiness[i.businessId] || 0) + (i.amount || 0)
      }
    }

    const businessesWithStats = businesses.map(b => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      email: b.email,
      active: b.active,
      createdAt: b.createdAt.toISOString(),
      customerCount: customerCounts[b.id] || 0,
      invoiceCount: invoiceCounts[b.id] || 0,
      totalRevenue: revenueByBusiness[b.id] || 0
    }))

    const totalCustomers = Object.values(customerCounts).reduce((a, b) => a + b, 0)
    const totalInvoices = Object.values(invoiceCounts).reduce((a, b) => a + b, 0)
    const totalRevenue = Object.values(revenueByBusiness).reduce((a, b) => a + b, 0)

    return NextResponse.json({
      businesses: businessesWithStats,
      stats: {
        totalBusinesses: businesses.length,
        activeBusinesses: businesses.filter(b => b.active).length,
        totalCustomers,
        totalInvoices,
        totalRevenue
      }
    })
  } catch (error) {
    console.error('❌ Superadmin error:', error)
    return NextResponse.json({ 
      error: 'Error del servidor',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}