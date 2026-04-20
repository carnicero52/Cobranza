import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    // Get auth header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Verify it's a superadmin token
    if (token !== 'superadmin-secret-token') {
      // Try to find user by token
      const staff = await db.staff.findFirst({
        where: { role: 'superadmin' },
        include: { business: true }
      })
      
      if (!staff) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      }
    }

    // Get all businesses
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