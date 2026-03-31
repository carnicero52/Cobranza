import { db } from '@/lib/db';
import { getAuthUser, extractTokenFromHeader } from '@/lib/auth';

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
        { error: 'Solo los administradores pueden eliminar personal' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Can't delete self
    if (id === user.id) {
      return Response.json(
        { error: 'No puedes eliminar tu propia cuenta' },
        { status: 400 }
      );
    }

    // Check staff exists and belongs to user's business
    const existingStaff = await db.staff.findFirst({
      where: { id, businessId: user.businessId },
    });

    if (!existingStaff) {
      return Response.json({ error: 'Personal no encontrado' }, { status: 404 });
    }

    await db.staff.delete({
      where: { id },
    });

    return Response.json({ success: true, message: 'Personal eliminado correctamente' });
  } catch (error) {
    console.error('Delete staff error:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
