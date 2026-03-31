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

    if (user.role !== 'admin') {
      return Response.json({ error: 'Solo los administradores pueden ver cobranzas' }, { status: 403 });
    }

    const invoices = await db.$queryRaw`
      SELECT id, businessId, concept, amount, currency, status, issueDate, dueDate, dueHour, message, createdAt, updatedAt
      FROM Invoice
      WHERE businessId = ${user.businessId}
      ORDER BY createdAt DESC
    `;

    return Response.json({ success: true, data: invoices });
  } catch (error) {
    console.error('List invoices error:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

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

    if (user.role !== 'admin') {
      return Response.json({ error: 'Solo los administradores pueden crear cobranzas' }, { status: 403 });
    }

    const body = await request.json();
    const { concept, amount, currency, status, issueDate, dueDate, dueHour, message } = body;

    if (!concept || concept.trim().length < 2) {
      return Response.json({ error: 'El concepto es obligatorio (mínimo 2 caracteres)' }, { status: 400 });
    }
    if (amount === undefined || amount === null || isNaN(Number(amount)) || Number(amount) <= 0) {
      return Response.json({ error: 'El monto debe ser un número mayor a 0' }, { status: 400 });
    }
    if (!issueDate) {
      return Response.json({ error: 'La fecha de emisión es obligatoria' }, { status: 400 });
    }

    const safeConcept = String(concept).replace(/'/g, "''");
    const safeAmount = Number(amount);
    const safeCurrency = String(currency || 'USD').replace(/'/g, "''");
    const safeStatus = String(status || 'pending').replace(/'/g, "''");
    const safeIssueDate = String(issueDate).replace(/'/g, "''");
    const safeDueDate = dueDate ? String(dueDate).replace(/'/g, "''") : null;
    const safeDueHour = dueHour ? String(dueHour).replace(/'/g, "''") : null;
    const safeMessage = message ? String(message).replace(/'/g, "''") : null;
    const bid = user.businessId.replace(/'/g, "''");

    await db.$executeRawUnsafe(`
      INSERT INTO Invoice (id, businessId, concept, amount, currency, status, issueDate, dueDate, dueHour, message, createdAt, updatedAt)
      VALUES (lower(hex(randomblob(12))), '${bid}', '${safeConcept}', ${safeAmount}, '${safeCurrency}', '${safeStatus}', '${safeIssueDate}', ${safeDueDate ? `'${safeDueDate}'` : 'NULL'}, ${safeDueHour ? `'${safeDueHour}'` : 'NULL'}, ${safeMessage ? `'${safeMessage}'` : 'NULL'}, datetime('now'), datetime('now'))
    `);

    const invoices = await db.$queryRaw`
      SELECT * FROM Invoice WHERE businessId = ${user.businessId} ORDER BY createdAt DESC LIMIT 1
    `;

    return Response.json({ success: true, data: (invoices as any[])[0] }, { status: 201 });
  } catch (error) {
    console.error('Create invoice error:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
