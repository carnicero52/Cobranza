import { getAuthUser, extractTokenFromHeader } from '@/lib/auth';
import { redeemReward } from '@/lib/loyalty-service';
import type { RedeemRewardPayload } from '@/lib/types';

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

    const body: RedeemRewardPayload = await request.json();
    const { customerId, rewardId } = body;

    // Validate required fields
    if (!customerId || !rewardId) {
      return Response.json(
        { error: 'El ID del cliente y de la recompensa son obligatorios' },
        { status: 400 }
      );
    }

    const result = await redeemReward(
      user.businessId,
      customerId,
      rewardId,
      user.id
    );

    if (!result.success) {
      return Response.json(
        { error: result.error || 'Error al canjear recompensa' },
        { status: 400 }
      );
    }

    return Response.json({
      success: true,
      data: {
        remainingPoints: result.remainingPoints,
      },
    });
  } catch (error) {
    console.error('Redeem reward error:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
