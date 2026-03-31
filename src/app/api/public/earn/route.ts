import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, businessId } = body;

    if (!email || !businessId) {
      return Response.json(
        { error: 'Email y businessId son obligatorios' },
        { status: 400 }
      );
    }

    // Validate business exists and is active
    const business = await db.business.findUnique({
      where: { id: businessId },
    });

    if (!business || !business.active) {
      return Response.json(
        { error: 'Negocio no encontrado' },
        { status: 404 }
      );
    }

    // Find customer
    const customer = await db.customer.findFirst({
      where: { email: email.toLowerCase().trim(), businessId },
    });

    if (!customer) {
      return Response.json(
        { error: 'Cliente no registrado en este negocio' },
        { status: 404 }
      );
    }

    // Get business settings for anti-cheat and points config
    const settings = await db.businessSettings.findUnique({
      where: { businessId },
    });

    const pointsToEarn = settings?.pointsPerPurchase || 1;
    const cooldownMinutes = settings?.cooldownMinutes || 30;
    const maxPointsPerDay = settings?.maxPointsPerDay || 0; // 0 = unlimited
    const maxPointsPerVisit = settings?.maxPointsPerVisit || 0; // 0 = unlimited
    const antiCheatEnabled = settings?.antiCheatEnabled !== false;

    // ---- Anti-cheat validations ----
    if (antiCheatEnabled) {
      // 1. Cooldown check
      if (cooldownMinutes > 0) {
        const lastEarn = await db.transaction.findFirst({
          where: {
            customerId: customer.id,
            businessId,
            type: 'earn',
          },
          orderBy: { createdAt: 'desc' },
        });

        if (lastEarn) {
          const elapsed = Date.now() - new Date(lastEarn.createdAt).getTime();
          const cooldownMs = cooldownMinutes * 60 * 1000;
          if (elapsed < cooldownMs) {
            const waitMinutes = Math.ceil((cooldownMs - elapsed) / (60 * 1000));
            return Response.json(
              {
                error: `Debes esperar ${waitMinutes} minuto(s) antes de registrar otra compra`,
                code: 'COOLDOWN',
                waitMinutes,
              },
              { status: 429 }
            );
          }
        }
      }

      // 2. Max points per day
      if (maxPointsPerDay > 0) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayAgg = await db.transaction.aggregate({
          where: {
            customerId: customer.id,
            businessId,
            type: 'earn',
            createdAt: { gte: todayStart },
          },
          _sum: { points: true },
        });

        const todayPoints = todayAgg._sum.points || 0;
        if (todayPoints + pointsToEarn > maxPointsPerDay) {
          const remaining = maxPointsPerDay - todayPoints;
          return Response.json(
            {
              error: `Has alcanzado el límite de puntos por hoy. Puedes ganar ${Math.max(0, remaining)} punto(s) más mañana`,
              code: 'DAILY_LIMIT',
              dailyLimit: maxPointsPerDay,
              earnedToday: todayPoints,
            },
            { status: 429 }
          );
        }
      }

      // 3. Max points per visit
      if (maxPointsPerVisit > 0 && pointsToEarn > maxPointsPerVisit) {
        return Response.json(
          {
            error: `El máximo de puntos por visita es ${maxPointsPerVisit}`,
            code: 'VISIT_LIMIT',
            maxPerVisit: maxPointsPerVisit,
          },
          { status: 400 }
        );
      }
    }

    // ---- Earn points atomically ----
    const result = await db.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          type: 'earn',
          points: pointsToEarn,
          description: 'Compra registrada por el cliente',
          customerId: customer.id,
          businessId,
        },
      });

      const updatedCustomer = await tx.customer.update({
        where: { id: customer.id },
        data: {
          totalPoints: { increment: pointsToEarn },
          visitsCount: { increment: 1 },
        },
      });

      return { transaction, updatedCustomer };
    });

    // Get updated reward goal
    const rewardGoal = settings?.rewardGoal || 10;

    return Response.json({
      success: true,
      data: {
        pointsEarned: pointsToEarn,
        totalPoints: result.updatedCustomer.totalPoints,
        visitsCount: result.updatedCustomer.visitsCount,
        rewardGoal,
        nextRewardIn: Math.max(0, rewardGoal - result.updatedCustomer.totalPoints),
        goalReached: result.updatedCustomer.totalPoints >= rewardGoal,
      },
    });
  } catch (error) {
    console.error('Public earn points error:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
