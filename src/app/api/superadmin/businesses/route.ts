import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// SIMPLE VERSION - No auth, just return data
export async function GET() {
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
}