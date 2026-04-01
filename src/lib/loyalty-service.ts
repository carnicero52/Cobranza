import { db } from '@/lib/db';
import type { DashboardStats } from '@/lib/types';

// =====================
// Loyalty Service - Business Rules
// =====================

export interface EarnPointsResult {
  success: boolean;
  newTotalPoints: number;
  goalReached: boolean;
  goalPoints: number;
  rewardName?: string;
  error?: string;
}

export async function earnPoints(
  businessId: string,
  customerId: string,
  staffId: string | undefined,
  points: number,
  description: string | undefined
): Promise<EarnPointsResult> {
  // Validate business exists
  const business = await db.business.findUnique({
    where: { id: businessId },
    include: { settings: true },
  });

  if (!business) {
    return { success: false, newTotalPoints: 0, goalReached: false, goalPoints: 0, error: 'Negocio no encontrado' };
  }

  // Validate customer belongs to business
  const customer = await db.customer.findFirst({
    where: { id: customerId, businessId },
  });

  if (!customer) {
    return { success: false, newTotalPoints: 0, goalReached: false, goalPoints: 0, error: 'Cliente no encontrado' };
  }

  const settings = business.settings;
  const pointsToEarn = points > 0 ? points : (settings?.pointsPerPurchase || 1);
  const goalPoints = settings?.rewardGoal || 10;

  // Use Prisma transaction for atomicity
  const result = await db.$transaction(async (tx) => {
    // Create transaction
    await tx.transaction.create({
      data: {
        type: 'earn',
        points: pointsToEarn,
        description: description || `Compra registrada - +${pointsToEarn} puntos`,
        customerId,
        businessId,
        staffId: staffId || null,
      },
    });

    // Update customer points and visits
    const updatedCustomer = await tx.customer.update({
      where: { id: customerId },
      data: {
        totalPoints: { increment: pointsToEarn },
        visitsCount: { increment: 1 },
      },
    });

    return updatedCustomer;
  });

  const goalReached = result.totalPoints >= goalPoints;
  const firstGoalReached = (result.totalPoints - pointsToEarn) < goalPoints && goalReached;

  // Queue notification if goal reached
  if (firstGoalReached && settings?.notifyOnReward) {
    const channels: string[] = [];
    if (settings.emailEnabled) channels.push('email');
    if (settings.telegramBotToken) channels.push('telegram');
    if (settings.whatsappEnabled && settings.whatsappPhone) channels.push('whatsapp');
    if (channels.length === 0) channels.push('in_app');

    for (const ch of channels) {
      await queueNotification(businessId, customerId, ch, '🏆 ¡Meta de puntos alcanzada!',
        `¡Felicidades! Has alcanzado ${goalPoints} puntos. ¡Puedes reclamar tu recompensa!`
      );
    }
  }

  return {
    success: true,
    newTotalPoints: result.totalPoints,
    goalReached: firstGoalReached,
    goalPoints,
  };
}

export async function redeemReward(
  businessId: string,
  customerId: string,
  rewardId: string,
  staffId: string | undefined
): Promise<{ success: boolean; error?: string; remainingPoints: number }> {
  const customer = await db.customer.findFirst({
    where: { id: customerId, businessId },
  });

  if (!customer) {
    return { success: false, error: 'Cliente no encontrado', remainingPoints: 0 };
  }

  const reward = await db.reward.findFirst({
    where: { id: rewardId, businessId, isActive: true },
  });

  if (!reward) {
    return { success: false, error: 'Recompensa no encontrada o inactiva', remainingPoints: customer.totalPoints };
  }

  if (customer.totalPoints < reward.requiredPoints) {
    return {
      success: false,
      error: `Puntos insuficientes. Necesitas ${reward.requiredPoints} puntos, tienes ${customer.totalPoints}`,
      remainingPoints: customer.totalPoints,
    };
  }

  const result = await db.$transaction(async (tx) => {
    // Create transaction (redeem type)
    const transaction = await tx.transaction.create({
      data: {
        type: 'redeem',
        points: -reward.requiredPoints,
        description: `Recompensa: ${reward.name}`,
        customerId,
        businessId,
        staffId: staffId || null,
      },
    });

    // Create redemption record
    await tx.rewardRedemption.create({
      data: {
        customerId,
        rewardId,
        transactionId: transaction.id,
      },
    });

    // Update customer points
    const updatedCustomer = await tx.customer.update({
      where: { id: customerId },
      data: {
        totalPoints: { decrement: reward.requiredPoints },
      },
    });

    return updatedCustomer;
  });

  // Queue notification for each enabled channel
  const bizSettings = await db.businessSettings.findUnique({ where: { businessId } });
  if (bizSettings?.notifyOnReward) {
    const channels: string[] = [];
    if (bizSettings.emailEnabled) channels.push('email');
    if (bizSettings.telegramBotToken) channels.push('telegram');
    if (bizSettings.whatsappEnabled && bizSettings.whatsappPhone) channels.push('whatsapp');
    if (channels.length === 0) channels.push('in_app');

    for (const ch of channels) {
      await queueNotification(businessId, customerId, ch, `🎁 Recompensa canjeada: ${reward.name}`,
        `¡Has canjeado: ${reward.name}! Te quedan ${result.totalPoints} puntos.`
      );
    }
  }

  return { success: true, remainingPoints: result.totalPoints };
}

// =====================
// Dashboard Stats
// =====================

export async function getDashboardStats(businessId: string): Promise<DashboardStats> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const monthAgo = new Date(today);
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  const [
    totalCustomers,
    totalPointsResult,
    transactionsToday,
    rewardsRedeemed,
    weekPoints,
    newCustomers,
  ] = await Promise.all([
    db.customer.count({ where: { businessId } }),
    db.customer.aggregate({ _sum: { totalPoints: true }, where: { businessId } }),
    db.transaction.count({ where: { businessId, createdAt: { gte: today } } }),
    db.rewardRedemption.count({ where: { reward: { businessId } } }),
    db.transaction.aggregate({
      _sum: { points: true },
      where: { businessId, type: 'earn', createdAt: { gte: weekAgo } },
    }),
    db.customer.count({ where: { businessId, registeredAt: { gte: monthAgo } } }),
  ]);

  return {
    totalCustomers,
    totalPoints: totalPointsResult._sum.totalPoints || 0,
    transactionsToday,
    rewardsRedeemed,
    pointsEarnedThisWeek: Math.abs(weekPoints._sum.points || 0),
    newCustomersThisMonth: newCustomers,
  };
}

export async function getChartData(businessId: string): Promise<{ date: string; points: number }[]> {
  const days = 14;
  const data: { date: string; points: number }[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const result = await db.transaction.aggregate({
      _sum: { points: true },
      where: {
        businessId,
        type: 'earn',
        createdAt: { gte: date, lt: nextDate },
      },
    });

    data.push({
      date: date.toISOString().split('T')[0],
      points: Math.abs(result._sum.points || 0),
    });
  }

  return data;
}

// =====================
// Notification Queue
// =====================

export async function queueNotification(
  businessId: string,
  customerId: string,
  channel: string,
  subject: string | null,
  message: string
): Promise<void> {
  await db.notificationQueue.create({
    data: { businessId, customerId, channel, subject, message, status: 'pending' },
  });
}
