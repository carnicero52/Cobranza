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

    // Admin only
    if (user.role !== 'admin') {
      return Response.json(
        { error: 'Solo los administradores pueden editar recompensas' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check reward exists and belongs to user's business
    const existingReward = await db.reward.findFirst({
      where: { id, businessId: user.businessId },
    });

    if (!existingReward) {
      return Response.json({ error: 'Recompensa no encontrada' }, { status: 404 });
    }

    const body = await request.json();

    // Build update data, only including fields that are provided
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = String(body.name);
      if (name.length < 2) {
        return Response.json({ error: 'El nombre debe tener al menos 2 caracteres' }, { status: 400 });
      }
      updateData.name = name;
    }

    if (body.description !== undefined) {
      updateData.description = body.description ? String(body.description) : null;
    }

    if (body.requiredPoints !== undefined) {
      const pts = Number(body.requiredPoints);
      if (isNaN(pts) || pts < 1 || !Number.isInteger(pts)) {
        return Response.json({ error: 'Los puntos requeridos deben ser un número entero positivo' }, { status: 400 });
      }
      updateData.requiredPoints = pts;
    }

    if (body.isActive !== undefined) {
      updateData.isActive = Boolean(body.isActive);
    }

    if (body.imageUrl !== undefined) {
      updateData.imageUrl = body.imageUrl ? String(body.imageUrl) : null;
    }

    if (Object.keys(updateData).length === 0) {
      return Response.json({ error: 'No se proporcionaron campos para actualizar' }, { status: 400 });
    }

    const updatedReward = await db.reward.update({
      where: { id },
      data: updateData,
    });

    return Response.json({ success: true, data: updatedReward });
  } catch (error) {
    console.error('Update reward error:', error);
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

    // Admin only
    if (user.role !== 'admin') {
      return Response.json(
        { error: 'Solo los administradores pueden eliminar recompensas' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check reward exists and belongs to user's business
    const existingReward = await db.reward.findFirst({
      where: { id, businessId: user.businessId },
    });

    if (!existingReward) {
      return Response.json({ error: 'Recompensa no encontrada' }, { status: 404 });
    }

    await db.reward.delete({
      where: { id },
    });

    return Response.json({ success: true, message: 'Recompensa eliminada correctamente' });
  } catch (error) {
    console.error('Delete reward error:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
