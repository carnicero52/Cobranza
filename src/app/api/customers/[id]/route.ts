import { db } from '@/lib/db';
import { getAuthUser, extractTokenFromHeader } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = extractTokenFromHeader(authHeader);
    if (!token) {
      return Response.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await getAuthUser(token);
    if (!user) {
      return Response.json({ error: 'Token inválido' }, { status: 401 });
    }

    const { id } = await params;

    const customer = await db.customer.findFirst({
      where: {
        id,
        businessId: user.businessId,
      },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            staff: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!customer) {
      return Response.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    return Response.json({ success: true, data: customer });
  } catch (error) {
    console.error('Get customer error:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = extractTokenFromHeader(authHeader);
    if (!token) {
      return Response.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await getAuthUser(token);
    if (!user) {
      return Response.json({ error: 'Token inválido' }, { status: 401 });
    }

    const { id } = await params;

    const existing = await db.customer.findFirst({
      where: { id, businessId: user.businessId },
    });
    if (!existing) {
      return Response.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) updates.name = String(body.name);
    if (body.email !== undefined) updates.email = String(body.email);
    if (body.phone !== undefined) updates.phone = body.phone ? String(body.phone) : null;
    if (body.telegramChatId !== undefined) updates.telegramChatId = body.telegramChatId ? String(body.telegramChatId) : null;
    if (body.whatsappPhone !== undefined) updates.whatsappPhone = body.whatsappPhone ? String(body.whatsappPhone) : null;

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'No hay campos para actualizar' }, { status: 400 });
    }

    const updated = await db.customer.update({
      where: { id },
      data: updates,
    });

    return Response.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update customer error:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = extractTokenFromHeader(authHeader);
    if (!token) {
      return Response.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await getAuthUser(token);
    if (!user) {
      return Response.json({ error: 'Token inválido' }, { status: 401 });
    }

    const { id } = await params;

    // Verify customer belongs to this business
    const customer = await db.customer.findFirst({
      where: { id, businessId: user.businessId },
    });

    if (!customer) {
      return Response.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    await db.customer.delete({ where: { id } });

    return Response.json({ success: true, message: 'Cliente eliminado' });
  } catch (error) {
    console.error('Delete customer error:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
