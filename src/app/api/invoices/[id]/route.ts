import { db } from '@/lib/db';
import { getAuthUser, extractTokenFromHeader } from '@/lib/auth';

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

    if (user.role !== 'admin') {
      return Response.json({ error: 'Solo los administradores pueden editar cobranzas' }, { status: 403 });
    }

    const { id } = await params;

    // Check invoice exists
    const existing = await db.invoice.findFirst({
      where: { id, businessId: user.businessId },
    });
    if (!existing) {
      return Response.json({ error: 'Cobranza no encontrada' }, { status: 404 });
    }

    const body = await request.json();
    const { concept, amount, currency, status, issueDate, dueDate, dueHour, message } = body;

    const data: Record<string, any> = {};

    if (concept !== undefined && String(concept).trim().length >= 2) {
      data.concept = concept;
    }
    if (amount !== undefined && !isNaN(Number(amount)) && Number(amount) > 0) {
      data.amount = Number(amount);
    }
    if (currency !== undefined) {
      data.currency = currency;
    }
    if (status !== undefined) {
      data.status = status;
    }
    if (issueDate !== undefined) {
      data.issueDate = issueDate;
    }
    if (dueDate !== undefined) {
      data.dueDate = dueDate || null;
    }
    if (dueHour !== undefined) {
      data.dueHour = dueHour || null;
    }
    if (message !== undefined) {
      data.message = message || null;
    }

    if (Object.keys(data).length === 0) {
      return Response.json({ error: 'No hay campos para actualizar' }, { status: 400 });
    }

    const updated = await db.invoice.update({
      where: { id, businessId: user.businessId },
      data,
    });

    return Response.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update invoice error:', error);
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

    if (user.role !== 'admin') {
      return Response.json({ error: 'Solo los administradores pueden eliminar cobranzas' }, { status: 403 });
    }

    const { id } = await params;

    await db.invoice.delete({
      where: { id, businessId: user.businessId },
    });

    return Response.json({ success: true, message: 'Cobranza eliminada correctamente' });
  } catch (error) {
    console.error('Delete invoice error:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
