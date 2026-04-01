import { db } from '@/lib/db';
import { getAuthUser, extractTokenFromHeader } from '@/lib/auth';

// Helper: get target customers based on campaign target
async function getTargetCustomers(businessId: string, target: string) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  switch (target) {
    case 'new':
      return db.customer.findMany({
        where: { businessId, registeredAt: { gte: thirtyDaysAgo } },
      });
    case 'inactive':
      return db.customer.findMany({
        where: { businessId, visitsCount: 0 },
      });
    case 'top':
      return db.customer.findMany({
        where: { businessId },
        orderBy: { totalPoints: 'desc' },
        take: 10,
      });
    case 'vip':
      return db.customer.findMany({
        where: { businessId, totalPoints: { gte: 50 } },
      });
    default: // 'all'
      return db.customer.findMany({
        where: { businessId },
      });
  }
}

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
    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) updates.name = String(body.name);
    if (body.message !== undefined) updates.message = String(body.message);
    if (body.target !== undefined) updates.target = String(body.target);
    if (body.channel !== undefined) updates.channel = String(body.channel);
    if (body.status !== undefined) updates.status = String(body.status);
    if (body.type !== undefined) updates.type = String(body.type);
    if (body.startsAt !== undefined) updates.startsAt = body.startsAt ? new Date(body.startsAt) : null;
    if (body.endsAt !== undefined) updates.endsAt = body.endsAt ? new Date(body.endsAt) : null;

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'No hay campos para actualizar' }, { status: 400 });
    }

    const updated = await db.marketingCampaign.update({
      where: { id },
      data: updates,
    });

    // When campaign is activated, queue notifications for target customers
    const newStatus = String(body.status || existing.status);
    if (newStatus === 'active' && existing.status !== 'active') {
      const channel = String(body.channel || existing.channel || 'in_app');
      const target = String(body.target || existing.target || 'all');
      const message = String(body.message || existing.message || '');

      try {
        const customers = await getTargetCustomers(user.businessId, target);

        // Determine notification channel(s)
        const channels: string[] = [];
        if (channel !== 'in_app') {
          channels.push(channel);
        }
        channels.push('in_app'); // Always queue in-app

        let queuedCount = 0;
        for (const customer of customers) {
          for (const ch of channels) {
            await db.notificationQueue.create({
              data: {
                businessId: user.businessId,
                customerId: customer.id,
                channel: ch,
                subject: `📢 ${String(body.name || existing.name)}`,
                message,
                status: 'pending',
              },
            });
            queuedCount++;
          }
        }

        // Update sent count
        await db.marketingCampaign.update({
          where: { id },
          data: { sentCount: queuedCount },
        });
      } catch (error) {
        console.error('Error queuing campaign notifications:', error);
      }
    }

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

    const campaign = await db.marketingCampaign.findFirst({
      where: { id, businessId: user.businessId },
    });
    if (!campaign) {
      return Response.json({ error: 'Campaña no encontrada' }, { status: 404 });
    }

    await db.marketingCampaign.delete({ where: { id } });

    return Response.json({ success: true, message: 'Campaña eliminada correctamente' });
  } catch (error) {
    console.error('Delete campaign error:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
