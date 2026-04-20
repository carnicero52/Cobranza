import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// SUPERADMIN API - Returns all businesses with stats
export async function GET() {
  try {
    console.log('🔧 Superadmin API called')
    
    const businesses = await db.business.findMany({
      orderBy: { createdAt: 'desc' }
    })

    // For each business, get customer and invoice counts
    const businessesWithStats = await Promise.all(
      businesses.map(async (b) => {
        const customerCount = await db.customer.count({ where: { businessId: b.id } })
        const invoiceCount = await db.invoice.count({ where: { businessId: b.id } })
        const paidInvoices = await db.invoice.aggregate({
          where: { businessId: b.id, status: 'paid' },
          _sum: { total: true }
        })
        
        return {
          id: b.id,
          name: b.name,
          slug: b.slug,
          email: b.email,
          active: b.active,
          createdAt: b.createdAt.toISOString(),
          customerCount,
          invoiceCount,
          totalRevenue: paidInvoices._sum.total ? Number(paidInvoices._sum.total) : 0
        }
      })
    )

    // Calculate totals
    const totalCustomers = businessesWithStats.reduce((sum, b) => sum + b.customerCount, 0)
    const totalInvoices = businessesWithStats.reduce((sum, b) => sum + b.invoiceCount, 0)
    const totalRevenue = businessesWithStats.reduce((sum, b) => sum + b.totalRevenue, 0)

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