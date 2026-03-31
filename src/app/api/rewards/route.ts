import { db } from '@/lib/db';
import { getAuthUser, extractTokenFromHeader } from '@/lib/auth';

export async function GET(request: Request) {
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

    // Show all rewards (active and inactive) so admin can manage them
    const rewards = await db.reward.findMany({
      where: {
        businessId: user.businessId,
      },
      orderBy: { createdAt: 'desc' },
    });

    return Response.json({ success: true, data: rewards });
  } catch (error) {
    console.error('List rewards error:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request: Request) {
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
        { error: 'Solo los administradores pueden crear recompensas' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, requiredPoints, imageUrl } = body;

    // Parse and validate requiredPoints (may come as string from form)
    const pts = requiredPoints !== undefined ? Number(requiredPoints) : null;

    if (!name || !pts) {
      return Response.json(
        { error: 'Nombre y puntos requeridos son obligatorios' },
        { status: 400 }
      );
    }

    if (name.length < 2) {
      return Response.json(
        { error: 'El nombre debe tener al menos 2 caracteres' },
        { status: 400 }
      );
    }

    if (isNaN(pts) || pts < 1 || !Number.isInteger(pts)) {
      return Response.json(
        { error: 'Los puntos requeridos deben ser un número entero positivo' },
        { status: 400 }
      );
    }

    const reward = await db.reward.create({
      data: {
        name: String(name),
        description: description ? String(description) : null,
        imageUrl: imageUrl ? String(imageUrl) : null,
        requiredPoints: pts,
        businessId: user.businessId,
      },
    });

    return Response.json({ success: true, data: reward }, { status: 201 });
  } catch (error) {
    console.error('Create reward error:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
