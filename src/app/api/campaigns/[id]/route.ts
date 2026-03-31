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
    const existing = await db.$queryRaw`
      SELECT id FROM MarketingCampaign WHERE id = ${id} AND businessId = ${user.businessId}
    `;
    if (!(existing as any[]).length) {
      return Response.json({ error: 'Campaña no encontrada' }, { status: 404 });
    }

    const body = await request.json();
    const { name, message, target, channel, status } = body;

    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined && name.length >= 2) { updates.push('name = ?'); values.push(name); }
    if (message !== undefined && message.length >= 5) { updates.push('message = ?'); values.push(message); }
    if (target) { updates.push('target = ?'); values.push(target); }
    if (channel) { updates.push('channel = ?'); values.push(channel); }
    if (status) { updates.push('status = ?'); values.push(status); }
    updates.push('updatedAt = datetime(\'now\')');

    if (updates.length <= 1) {
      return Response.json({ error: 'No hay campos para actualizar' }, { status: 400 });
    }

    await db.$executeRawUnsafe(
      `UPDATE MarketingCampaign SET ${updates.join(', ')} WHERE id = '${id}' AND businessId = '${user.businessId}'`,
    );

    const updated = await db.$queryRaw`
      SELECT * FROM MarketingCampaign WHERE id = ${id}
    `;

    return Response.json({ success: true, data: (updated as any[])[0] });
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

    await db.$executeRawUnsafe(
      `DELETE FROM MarketingCampaign WHERE id = '${id}' AND businessId = '${user.businessId}'`
    );

    return Response.json({ success: true, message: 'Campaña eliminada correctamente' });
  } catch (error) {
    console.error('Delete campaign error:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
