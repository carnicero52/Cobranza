import { db } from '@/lib/db';
import { getAuthUser, extractTokenFromHeader } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const customer = await db.customer.findFirst({
      where: {
        id,
        businessId: user.businessId,
      },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            staff: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!customer) {
      return Response.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    return Response.json({ success: true, data: customer });
  } catch (error) {
    console.error('Get customer error:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
