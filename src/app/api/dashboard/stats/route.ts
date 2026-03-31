import { getAuthUser, extractTokenFromHeader } from '@/lib/auth';
import { getDashboardStats } from '@/lib/loyalty-service';

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

    const stats = await getDashboardStats(user.businessId);

    return Response.json({ success: true, data: stats });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
