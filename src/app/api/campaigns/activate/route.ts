import { getAuthUser, extractTokenFromHeader } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * POST /api/campaigns/activate
 * Activate a campaign and send notifications to customers
 */
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
      return Response.json({ error: 'Solo los administradores pueden activar campañas' }, { status: 403 });
    }

    const body = await request.json();
    const { campaignId } = body;

    if (!campaignId) {
      return Response.json({ error: 'El ID de la campaña es obligatorio' }, { status: 400 });
    }

    // Get campaign
    const campaign = await db.marketingCampaign.findFirst({
      where: { id: campaignId, businessId: user.businessId },
    });

    if (!campaign) {
      return Response.json({ error: 'Campaña no encontrada' }, { status: 404 });
    }

    if (campaign.status === 'active') {
      return Response.json({ error: 'La campaña ya está activa' }, { status: 400 });
    }

    // Update status to active
    const updated = await db.marketingCampaign.update({
      where: { id: campaignId },
      data: { status: 'active' },
    });

    // Get customers based on target
    let customersToNotify = await db.customer.findMany({
      where: { businessId: user.businessId },
      select: { id: true },
    });

    // Apply target filter
    switch (campaign.target) {
      case 'new': {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        customersToNotify = customersToNotify.filter(c => false); // filtered below
        const recent = await db.customer.findMany({
          where: { businessId: user.businessId, registeredAt: { gte: weekAgo } },
          select: { id: true },
        });
        customersToNotify = recent;
        break;
      }
      case 'inactive': {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        const inactiveIds = await db.transaction.groupBy({
          by: ['customerId'],
          where: {
            businessId: user.businessId,
            createdAt: { gte: monthAgo },
          },
          _count: { id: true },
        });
        const activeIds = new Set(inactiveIds.map(t => t.customerId));
        customersToNotify = customersToNotify.filter(c => !activeIds.has(c.id));
        break;
      }
      case 'top': {
        const topCustomers = await db.customer.findMany({
          where: { businessId: user.businessId },
          orderBy: { totalPoints: 'desc' },
          take: 10,
          select: { id: true },
        });
        customersToNotify = topCustomers;
        break;
      }
      case 'vip': {
        const vipCustomers = await db.customer.findMany({
          where: { businessId: user.businessId, totalPoints: { gte: 50 } },
          select: { id: true },
        });
        customersToNotify = vipCustomers;
        break;
      }
      // 'all' and 'custom' use all customers
    }

    // Send notifications in parallel
    if (customersToNotify.length > 0) {
      // Dynamic import to avoid CJS/ESM issues
      const { notifyCustomer } = await import('@/lib/notification-service');

      const results = await Promise.allSettled(
        customersToNotify.map(customer =>
          notifyCustomer(user.businessId, customer.id, 'campaign_message', {
            campaignMessage: campaign.message,
          })
        )
      );

      const sent = results.filter(r => r.status === 'fulfilled').length;

      await db.marketingCampaign.update({
        where: { id: campaignId },
        data: { sentCount: sent },
      });
    }

    return Response.json({
      success: true,
      data: {
        campaign: updated,
        sentCount: customersToNotify.length,
        message: `Campaña "${campaign.name}" activada. ${customersToNotify.length} notificación(es) enviada(s).`,
      },
    });
  } catch (error) {
    console.error('Activate campaign error:', error);
    return Response.json({ error: 'Error al activar campaña' }, { status: 500 });
  }
}
