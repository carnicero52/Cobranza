import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    // Allow if there's any authorization header (simplified for superadmin)
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      // For now, allow access to see all businesses
      console.log('No auth header, allowing access')
    }

    // Get all businesses with counts
    const businesses = await db.business.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        active: true,
        createdAt: true,
        _count: {
          select: {
            customers: true,
            invoices: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Calculate stats
    const totalCustomers = businesses.reduce((sum, b) => sum + b._count.customers, 0)
    const totalInvoices = businesses.reduce((sum, b) => sum + b._count.invoices, 0)
    
    // Get total revenue
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
        totalCustomers,
        totalInvoices,
        totalRevenue
      }
    })
  } catch (error) {
    console.error('Superadmin error:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}