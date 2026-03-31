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
    // Anti-Cheat Validation (Prisma queries, compatible with PostgreSQL & SQLite)
    // =====================
    const settings = await db.businessSettings.findUnique({
      where: { businessId: user.businessId },
      select: {
        antiCheatEnabled: true,
        cooldownMinutes: true,
        maxPointsPerDay: true,
        maxPointsPerVisit: true,
        pointsPerPurchase: true,
      },
    });

    const pointsToEarn = points && points > 0 ? points : (settings?.pointsPerPurchase || 1);

    if (settings?.antiCheatEnabled) {
      // 1. Cooldown check
      if (settings.cooldownMinutes > 0) {
        const lastTx = await db.transaction.findFirst({
          where: {
            customerId,
            businessId: user.businessId,
            type: 'earn',
          },
          orderBy: { createdAt: 'desc' },
        });

        if (lastTx) {
          const minutesSinceLast = (Date.now() - lastTx.createdAt.getTime()) / 60000;
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
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayTotal = await db.transaction.aggregate({
          where: {
            customerId,
            businessId: user.businessId,
            type: 'earn',
            createdAt: { gte: todayStart },
          },
          _sum: { points: true },
        });

        const currentTotal = todayTotal._sum.points || 0;
        if (currentTotal + pointsToEarn > settings.maxPointsPerDay) {
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
