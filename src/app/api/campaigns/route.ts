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

    const campaigns = await db.$queryRaw`
      SELECT id, name, type, message, target, channel, status, sentCount, businessId, startsAt, endsAt, createdAt, updatedAt
      FROM MarketingCampaign
      WHERE businessId = ${user.businessId}
      ORDER BY createdAt DESC
    `;

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

    const safeName = String(name).replace(/'/g, "''");
    const safeMessage = String(message).replace(/'/g, "''");
    const safeType = String(type || 'promo').replace(/'/g, "''");
    const safeTarget = String(target || 'all').replace(/'/g, "''");
    const safeChannel = String(channel || 'in_app').replace(/'/g, "''");
    const bid = user.businessId.replace(/'/g, "''");

    await db.$executeRawUnsafe(`
      INSERT INTO MarketingCampaign (id, name, type, message, target, channel, status, sentCount, businessId, createdAt, updatedAt)
      VALUES (lower(hex(randomblob(12))), '${safeName}', '${safeType}', '${safeMessage}', '${safeTarget}', '${safeChannel}', 'draft', 0, '${bid}', datetime('now'), datetime('now'))
    `);

    const campaigns = await db.$queryRaw`
      SELECT * FROM MarketingCampaign WHERE businessId = ${user.businessId} ORDER BY createdAt DESC LIMIT 1
    `;

    return Response.json({ success: true, data: campaigns[0] }, { status: 201 });
  } catch (error) {
    console.error('Create campaign error:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
