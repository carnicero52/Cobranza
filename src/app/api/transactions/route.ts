import { db } from '@/lib/db';
import { getAuthUser, extractTokenFromHeader } from '@/lib/auth';

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const type = searchParams.get('type') || '';

    const where: Record<string, unknown> = {
      businessId: user.businessId,
    };

    if (type === 'earn' || type === 'redeem') {
      where.type = type;
    }

    const [transactions, total] = await Promise.all([
      db.transaction.findMany({
        where,
        include: {
          customer: {
            select: { id: true, name: true, email: true },
          },
          staff: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.transaction.count({ where }),
    ]);

    return Response.json({
      success: true,
      data: transactions,
      pagination: {
        total,
        page,
        limit,
      },
    });
  } catch (error) {
    console.error('List transactions error:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
