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

    // Check invoice exists and belongs to business
    const existing = await db.invoice.findFirst({
      where: { id, businessId: user.businessId },
    });
    if (!existing) {
      return Response.json({ error: 'Cobranza no encontrada' }, { status: 404 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.concept !== undefined) updates.concept = String(body.concept);
    if (body.amount !== undefined && !isNaN(Number(body.amount)) && Number(body.amount) > 0) {
      updates.amount = Number(body.amount);
    }
    if (body.currency !== undefined) updates.currency = String(body.currency);
    if (body.status !== undefined) updates.status = String(body.status);
    if (body.issueDate !== undefined) updates.issueDate = String(body.issueDate);
    if (body.dueDate !== undefined) updates.dueDate = body.dueDate ? String(body.dueDate) : null;
    if (body.dueHour !== undefined) updates.dueHour = body.dueHour ? String(body.dueHour) : null;
    if (body.message !== undefined) updates.message = body.message ? String(body.message) : null;

    // Handle customer assignment
    if (body.customerId !== undefined) {
      if (body.customerId) {
        const customer = await db.customer.findFirst({
          where: { id: body.customerId, businessId: user.businessId },
        });
        updates.customerId = body.customerId;
        updates.customerName = customer ? customer.name : null;
      } else {
        updates.customerId = null;
        updates.customerName = null;
      }
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'No hay campos para actualizar' }, { status: 400 });
    }

    const updated = await db.invoice.update({
      where: { id },
      data: updates,
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

    const invoice = await db.invoice.findFirst({
      where: { id, businessId: user.businessId },
    });
    if (!invoice) {
      return Response.json({ error: 'Cobranza no encontrada' }, { status: 404 });
    }

    await db.invoice.delete({ where: { id } });

    return Response.json({ success: true, message: 'Cobranza eliminada correctamente' });
  } catch (error) {
    console.error('Delete invoice error:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
