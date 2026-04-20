import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// SIMPLE VERSION - No auth
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { active } = await request.json()

  const business = await db.business.update({
    where: { id },
    data: { active }
  })

  return NextResponse.json({ 
    success: true, 
    business: { id: business.id, active: business.active } 
  })
}