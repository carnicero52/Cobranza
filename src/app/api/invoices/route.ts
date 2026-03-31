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

    const invoices = await db.invoice.findMany({
      where: { businessId: user.businessId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        businessId: true,
        concept: true,
        amount: true,
        currency: true,
        status: true,
        issueDate: true,
        dueDate: true,
        dueHour: true,
        message: true,
        customerIds: true,
        reminderSent: true,
        reminderSentAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

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

    const invoice = await db.invoice.create({
      data: {
        concept,
        amount: Number(amount),
        currency: currency || 'USD',
        status: status || 'pending',
        issueDate,
        dueDate: dueDate || null,
        dueHour: dueHour || null,
        message: message || null,
        businessId: user.businessId,
      },
    });

    return Response.json({ success: true, data: invoice }, { status: 201 });
  } catch (error) {
    console.error('Create invoice error:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
