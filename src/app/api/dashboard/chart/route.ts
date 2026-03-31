import { getAuthUser, extractTokenFromHeader } from '@/lib/auth';
import { getChartData } from '@/lib/loyalty-service';

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

    const data = await getChartData(user.businessId);

    return Response.json({ success: true, data });
  } catch (error) {
    console.error('Dashboard chart error:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
