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
      return Response.json({ error: 'Solo los administradores pueden editar campañas' }, { status: 403 });
    }

    const { id } = await params;

    // Check campaign exists
    const existing = await db.marketingCampaign.findFirst({
      where: { id, businessId: user.businessId },
    });
    if (!existing) {
      return Response.json({ error: 'Campaña no encontrada' }, { status: 404 });
    }

    const body = await request.json();
    const { name, message, target, channel, status, startsAt, endsAt } = body;

    const data: Record<string, any> = {};

    if (name !== undefined && name.length >= 2) {
      data.name = name;
    }
    if (message !== undefined && message.length >= 5) {
      data.message = message;
    }
    if (target) {
      data.target = target;
    }
    if (channel) {
      data.channel = channel;
    }
    if (status) {
      data.status = status;
    }
    if (startsAt !== undefined) {
      data.startsAt = startsAt ? new Date(startsAt) : null;
    }
    if (endsAt !== undefined) {
      data.endsAt = endsAt ? new Date(endsAt) : null;
    }

    if (Object.keys(data).length === 0) {
      return Response.json({ error: 'No hay campos para actualizar' }, { status: 400 });
    }

    const updated = await db.marketingCampaign.update({
      where: { id, businessId: user.businessId },
      data,
    });

    return Response.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update campaign error:', error);
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
      return Response.json({ error: 'Solo los administradores pueden eliminar campañas' }, { status: 403 });
    }

    const { id } = await params;

    await db.marketingCampaign.delete({
      where: { id, businessId: user.businessId },
    });

    return Response.json({ success: true, message: 'Campaña eliminada correctamente' });
  } catch (error) {
    console.error('Delete campaign error:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
