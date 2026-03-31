import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return Response.json(
        { error: 'El slug del negocio es obligatorio' },
        { status: 400 }
      );
    }

    const business = await db.business.findUnique({
      where: { slug },
    });

    if (!business || !business.active) {
      return Response.json(
        { error: 'Negocio no encontrado' },
        { status: 404 }
      );
    }

    // Get settings (public-safe fields only)
    const settings = await db.businessSettings.findUnique({
      where: { businessId: business.id },
    });

    // Get active rewards (without select to avoid Prisma client cache issues)
    const rewards = await db.reward.findMany({
      where: {
        businessId: business.id,
        isActive: true,
      },
      orderBy: { requiredPoints: 'asc' },
    });

    const safeRewards = rewards.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      imageUrl: r.imageUrl,
      requiredPoints: r.requiredPoints,
    }));

    return Response.json({
      success: true,
      data: {
        id: business.id,
        name: business.name,
        slug: business.slug,
        description: business.description,
        logo: business.logo,
        color: business.color,
        address: business.address,
        settings: settings ? {
          rewardGoal: settings.rewardGoal,
          pointsPerPurchase: settings.pointsPerPurchase,
          cooldownMinutes: settings.cooldownMinutes,
          promoMessage: settings.promoMessage,
          promoEnabled: settings.promoEnabled,
          referralEnabled: settings.referralEnabled,
          referralBonusPoints: settings.referralBonusPoints,
        } : null,
        rewards: safeRewards,
      },
    });
  } catch (error) {
    console.error('Public business lookup error:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
