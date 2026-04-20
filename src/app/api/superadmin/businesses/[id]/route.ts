import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { active } = body

    const business = await db.business.update({
      where: { id },
      data: { active }
    })

    return NextResponse.json({ 
      success: true, 
      business: { id: business.id, active: business.active } 
    })
  } catch (error) {
    console.error('Update business error:', error)
    return NextResponse.json({ error: 'Error actualizando' }, { status: 500 })
  }
}