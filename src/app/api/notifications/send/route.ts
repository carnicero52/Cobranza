import { getAuthUser, extractTokenFromHeader } from '@/lib/auth';
import { db } from '@/lib/db';

// Dynamic import to avoid CJS/ESM issues with nodemailer at build time

/**
 * POST /api/notifications/send
 * Send notification to specific customers (used by billing & marketing)
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

    const body = await request.json();
    const { customerIds, event, extra } = body;

    if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
      return Response.json({ error: 'Selecciona al menos un cliente' }, { status: 400 });
    }

    if (!event) {
      return Response.json({ error: 'El tipo de evento es obligatorio' }, { status: 400 });
    }

    // Dynamic import of notification service
    const { notifyCustomer } = await import('@/lib/notification-service');

    // Send notifications to all selected customers (parallel)
    const results = await Promise.allSettled(
      customerIds.map(async (customerId: string) => {
        // Verify customer belongs to business
        const customer = await db.customer.findFirst({
          where: { id: customerId, businessId: user.businessId },
        });

        if (!customer) return { customerId, success: false, error: 'Cliente no encontrado' };

        const result = await notifyCustomer(
          user.businessId,
          customerId,
          event,
          extra || {}
        );

        return { customerId, success: true, ...result };
      })
    );

    const sent = results.filter(r => r.status === 'fulfilled' && (r.value as { success: boolean }).success).length;
    const failed = results.length - sent;

    return Response.json({
      success: true,
      data: {
        sent,
        failed,
        total: results.length,
        message: `Notificaciones enviadas: ${sent} exitosa(s), ${failed} fallida(s)`,
      },
    });
  } catch (error) {
    console.error('Send notifications error:', error);
    return Response.json({ error: 'Error al enviar notificaciones' }, { status: 500 });
  }
}
