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

    if (user.role !== 'admin') {
      return Response.json({ error: 'Solo los administradores pueden ver campañas' }, { status: 403 });
    }

    const campaigns = await db.marketingCampaign.findMany({
      where: { businessId: user.businessId },
      orderBy: { createdAt: 'desc' },
    });

    return Response.json({ success: true, data: campaigns });
  } catch (error) {
    console.error('List campaigns error:', error);
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

    if (user.role !== 'admin') {
      return Response.json({ error: 'Solo los administradores pueden crear campañas' }, { status: 403 });
    }

    const body = await request.json();
    const { name, type, message, target, channel, startsAt, endsAt } = body;

    if (!name || !message) {
      return Response.json({ error: 'Nombre y mensaje son obligatorios' }, { status: 400 });
    }
    if (name.length < 2) {
      return Response.json({ error: 'El nombre debe tener al menos 2 caracteres' }, { status: 400 });
    }
    if (message.length < 5) {
      return Response.json({ error: 'El mensaje debe tener al menos 5 caracteres' }, { status: 400 });
    }

    const campaign = await db.marketingCampaign.create({
      data: {
        businessId: user.businessId,
        name: String(name),
        type: String(type || 'promo'),
        message: String(message),
        target: String(target || 'all'),
        channel: String(channel || 'in_app'),
        status: 'draft',
        sentCount: 0,
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
      },
    });

    return Response.json({ success: true, data: campaign }, { status: 201 });
  } catch (error) {
    console.error('Create campaign error:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
