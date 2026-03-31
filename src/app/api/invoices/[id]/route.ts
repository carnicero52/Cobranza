import { db } from '@/lib/db';
import { getAuthUser, extractTokenFromHeader } from '@/lib/auth';

export async function PUT(
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

    if (user.role !== 'admin') {
      return Response.json({ error: 'Solo los administradores pueden editar cobranzas' }, { status: 403 });
    }

    const { id } = await params;

    // Check invoice exists
    const existing = await db.$queryRaw`
      SELECT id FROM Invoice WHERE id = ${id} AND businessId = ${user.businessId}
    `;
    if (!(existing as any[]).length) {
      return Response.json({ error: 'Cobranza no encontrada' }, { status: 404 });
    }

    const body = await request.json();
    const { concept, amount, currency, status, issueDate, dueDate, dueHour, message } = body;

    const updates: string[] = [];
    const values: any[] = [];

    if (concept !== undefined && String(concept).trim().length >= 2) {
      updates.push('concept = ?');
      values.push(String(concept).replace(/'/g, "''"));
    }
    if (amount !== undefined && !isNaN(Number(amount)) && Number(amount) > 0) {
      updates.push('amount = ?');
      values.push(Number(amount));
    }
    if (currency !== undefined) {
      updates.push('currency = ?');
      values.push(String(currency).replace(/'/g, "''"));
    }
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(String(status).replace(/'/g, "''"));
    }
    if (issueDate !== undefined) {
      updates.push('issueDate = ?');
      values.push(String(issueDate).replace(/'/g, "''"));
    }
    if (dueDate !== undefined) {
      updates.push('dueDate = ?');
      values.push(dueDate ? String(dueDate).replace(/'/g, "''") : null);
    }
    if (dueHour !== undefined) {
      updates.push('dueHour = ?');
      values.push(dueHour ? String(dueHour).replace(/'/g, "''") : null);
    }
    if (message !== undefined) {
      updates.push('message = ?');
      values.push(message ? String(message).replace(/'/g, "''") : null);
    }

    updates.push("updatedAt = datetime('now')");

    if (updates.length <= 1) {
      return Response.json({ error: 'No hay campos para actualizar' }, { status: 400 });
    }

    // Build parameterized query
    const setClause = updates.slice(0, -1).join(', ');
    await db.$executeRawUnsafe(
      `UPDATE Invoice SET ${setClause}, updatedAt = datetime('now') WHERE id = '${id}' AND businessId = '${user.businessId}'`,
    );

    const updated = await db.$queryRaw`
      SELECT id, businessId, concept, amount, currency, status, issueDate, dueDate, dueHour, message, createdAt, updatedAt
      FROM Invoice WHERE id = ${id}
    `;

    return Response.json({ success: true, data: (updated as any[])[0] });
  } catch (error) {
    console.error('Update invoice error:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(
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

    if (user.role !== 'admin') {
      return Response.json({ error: 'Solo los administradores pueden eliminar cobranzas' }, { status: 403 });
    }

    const { id } = await params;

    await db.$executeRawUnsafe(
      `DELETE FROM Invoice WHERE id = '${id}' AND businessId = '${user.businessId}'`
    );

    return Response.json({ success: true, message: 'Cobranza eliminada correctamente' });
  } catch (error) {
    console.error('Delete invoice error:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
