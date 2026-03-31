import { db } from '@/lib/db';
import { getAuthUser, extractTokenFromHeader } from '@/lib/auth';
import type { UpdateBusinessSettingsPayload } from '@/lib/types';

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

    let settings = await db.businessSettings.findUnique({
      where: { businessId: user.businessId },
    });

    // Create default settings if they don't exist
    if (!settings) {
      settings = await db.businessSettings.create({
        data: { businessId: user.businessId },
      });
    }

    return Response.json({ success: true, data: settings });
  } catch (error) {
    console.error('Get settings error:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
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

    const body: UpdateBusinessSettingsPayload = await request.json();

    // At least one field must be provided
    if (Object.keys(body).length === 0) {
      return Response.json(
        { error: 'Debe proporcionar al menos un campo para actualizar' },
        { status: 400 }
      );
    }

    // Validate numeric fields
    if (body.pointsPerPurchase !== undefined && body.pointsPerPurchase < 1) {
      return Response.json(
        { error: 'Los puntos por compra deben ser al menos 1' },
        { status: 400 }
      );
    }

    if (body.rewardGoal !== undefined && body.rewardGoal < 1) {
      return Response.json(
        { error: 'La meta de recompensa debe ser al menos 1' },
        { status: 400 }
      );
    }

    // Upsert settings
    const updatedSettings = await db.businessSettings.upsert({
      where: { businessId: user.businessId },
      create: {
        businessId: user.businessId,
        ...body,
      },
      update: {
        ...body,
      },
    });

    return Response.json({ success: true, data: updatedSettings });
  } catch (error) {
    console.error('Update settings error:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
