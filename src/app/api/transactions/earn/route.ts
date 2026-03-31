import { db } from '@/lib/db';
import { getAuthUser, extractTokenFromHeader } from '@/lib/auth';
import { earnPoints } from '@/lib/loyalty-service';
import type { EarnPointsPayload } from '@/lib/types';

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

    const body: EarnPointsPayload = await request.json();
    const { customerId, points, description } = body;

    if (!customerId) {
      return Response.json({ error: 'El ID del cliente es obligatorio' }, { status: 400 });
    }

    if (points !== undefined && (points < 1 || !Number.isInteger(points))) {
      return Response.json({ error: 'Los puntos deben ser un número entero positivo' }, { status: 400 });
    }

    // =====================
    // Anti-Cheat Validation (raw SQL to bypass Prisma client cache)
    // =====================
    const settingsRows = await db.$queryRaw`
      SELECT antiCheatEnabled, cooldownMinutes, maxPointsPerDay, maxPointsPerVisit, pointsPerPurchase
      FROM BusinessSettings
      WHERE businessId = ${user.businessId}
    ` as any[];

    const settings = settingsRows[0];
    const pointsToEarn = points && points > 0 ? points : (settings?.pointsPerPurchase || 1);

    if (settings?.antiCheatEnabled === 1 || settings?.antiCheatEnabled === true) {
      // 1. Cooldown check
      if (settings.cooldownMinutes > 0) {
        const lastTxRows = await db.$queryRaw`
          SELECT createdAt FROM "Transaction"
          WHERE customerId = ${customerId} AND businessId = ${user.businessId} AND type = 'earn'
          ORDER BY createdAt DESC LIMIT 1
        ` as any[];

        if (lastTxRows.length > 0) {
          const lastDate = new Date(lastTxRows[0].createdAt);
          const minutesSinceLast = (Date.now() - lastDate.getTime()) / 60000;
          if (minutesSinceLast < settings.cooldownMinutes) {
            const waitMinutes = Math.ceil(settings.cooldownMinutes - minutesSinceLast);
            return Response.json(
              { error: `Debes esperar ${waitMinutes} minutos entre visitas (anti-trampas activado)` },
              { status: 429 }
            );
          }
        }
      }

      // 2. Max points per day
      if (settings.maxPointsPerDay > 0) {
        const todayPointsRows = await db.$queryRaw`
          SELECT COALESCE(SUM(points), 0) as total FROM "Transaction"
          WHERE customerId = ${customerId} AND businessId = ${user.businessId} AND type = 'earn'
            AND createdAt >= datetime('now', 'start of day')
        ` as any[];

        const todayTotal = todayPointsRows[0]?.total || 0;
        if (todayTotal + pointsToEarn > settings.maxPointsPerDay) {
          return Response.json(
            { error: `Límite diario alcanzado: ${settings.maxPointsPerDay} puntos por día` },
            { status: 429 }
          );
        }
      }

      // 3. Max points per visit
      if (settings.maxPointsPerVisit > 0 && pointsToEarn > settings.maxPointsPerVisit) {
        return Response.json(
          { error: `Máximo ${settings.maxPointsPerVisit} puntos por visita` },
          { status: 400 }
        );
      }
    }

    const result = await earnPoints(
      user.businessId,
      customerId,
      user.id,
      points || 0,
      description
    );

    if (!result.success) {
      return Response.json(
        { error: result.error || 'Error al registrar puntos' },
        { status: 400 }
      );
    }

    return Response.json({
      success: true,
      data: {
        newTotalPoints: result.newTotalPoints,
        goalReached: result.goalReached,
        goalPoints: result.goalPoints,
      },
    });
  } catch (error) {
    console.error('Earn points error:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
