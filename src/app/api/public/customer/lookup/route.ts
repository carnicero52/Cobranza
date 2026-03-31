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

    // Look up customer by email + businessId (multi-tenant)
    const customer = await db.customer.findFirst({
      where: { email: email.toLowerCase().trim(), businessId },
    });

    if (!customer) {
      return Response.json(
        { error: 'Cliente no encontrado en este negocio' },
        { status: 404 }
      );
    }

    // Get business settings (rewardGoal for progress calculation)
    const settings = await db.businessSettings.findUnique({
      where: { businessId },
    });

    const rewardGoal = settings?.rewardGoal || 10;

    // Get recent transactions (last 10)
    const recentTransactions = await db.transaction.findMany({
      where: { customerId: customer.id, businessId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const safeTransactions = recentTransactions.map((t) => ({
      id: t.id,
      type: t.type,
      points: t.points,
      description: t.description,
      createdAt: t.createdAt,
    }));

    // Get active rewards
    const rewards = await db.reward.findMany({
      where: { businessId, isActive: true },
      orderBy: { requiredPoints: 'asc' },
    });

    const rewardsWithProgress = rewards.map((reward) => ({
      id: reward.id,
      name: reward.name,
      description: reward.description,
      imageUrl: reward.imageUrl,
      requiredPoints: reward.requiredPoints,
      canRedeem: customer.totalPoints >= reward.requiredPoints,
      progress: Math.min(
        100,
        Math.round((customer.totalPoints / reward.requiredPoints) * 100)
      ),
      pointsNeeded: Math.max(0, reward.requiredPoints - customer.totalPoints),
    }));

    // Return FLAT structure matching what the frontend expects
    return Response.json({
      success: true,
      data: {
        id: customer.id,
        name: customer.name,
        totalPoints: customer.totalPoints,
        visitsCount: customer.visitsCount,
        rewardGoal,
        rewards: rewardsWithProgress,
        recentTransactions: safeTransactions,
      },
    });
  } catch (error) {
    console.error('Public customer lookup error:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
