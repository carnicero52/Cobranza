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
    });

    // Build plain objects with customerName resolved
    const data = invoices.map(inv => ({
      id: inv.id,
      businessId: inv.businessId,
      customerId: inv.customerId,
      customerName: inv.customerName || null,
      concept: inv.concept,
      amount: inv.amount,
      currency: inv.currency,
      status: inv.status,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      dueHour: inv.dueHour,
      message: inv.message,
      createdAt: inv.createdAt.toISOString(),
      updatedAt: inv.updatedAt.toISOString(),
    }));

    return Response.json({ success: true, data });
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
    const { concept, amount, currency, status, issueDate, dueDate, dueHour, message, customerId } = body;

    if (!concept || concept.trim().length < 2) {
      return Response.json({ error: 'El concepto es obligatorio (mínimo 2 caracteres)' }, { status: 400 });
    }
    if (amount === undefined || amount === null || isNaN(Number(amount)) || Number(amount) <= 0) {
      return Response.json({ error: 'El monto debe ser un número mayor a 0' }, { status: 400 });
    }
    if (!issueDate) {
      return Response.json({ error: 'La fecha de emisión es obligatoria' }, { status: 400 });
    }

    // If customerId provided, verify it belongs to this business
    let customerName: string | null = null;
    if (customerId) {
      const customer = await db.customer.findFirst({
        where: { id: customerId, businessId: user.businessId },
      });
      if (customer) {
        customerName = customer.name;
      }
    }

    const invoice = await db.invoice.create({
      data: {
        businessId: user.businessId,
        customerId: customerId || null,
        customerName,
        concept: String(concept),
        amount: Number(amount),
        currency: String(currency || 'USD'),
        status: String(status || 'pending'),
        issueDate: String(issueDate),
        dueDate: dueDate ? String(dueDate) : null,
        dueHour: dueHour ? String(dueHour) : null,
        message: message ? String(message) : null,
      },
    });

    return Response.json({ success: true, data: invoice }, { status: 201 });
  } catch (error) {
    console.error('Create invoice error:', error);
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return Response.json({ error: 'Error interno del servidor', details: msg }, { status: 500 });
  }
}
