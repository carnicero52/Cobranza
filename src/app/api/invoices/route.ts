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
      notifyChannels: inv.notifyChannels || null,
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
    const { concept, amount, currency, status, issueDate, dueDate, dueHour, message, customerId, notifyChannels } = body;

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

    // Parse notification channels
    let parsedChannels: string | null = null;
    if (notifyChannels) {
      // If it's already a JSON string, use it; if it's an array, stringify it
      if (typeof notifyChannels === 'string') {
        parsedChannels = notifyChannels;
      } else if (Array.isArray(notifyChannels)) {
        parsedChannels = JSON.stringify(notifyChannels);
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
        notifyChannels: parsedChannels,
      },
    });

    // Queue notifications for selected channels if customer is assigned
    if (customerId && parsedChannels) {
      try {
        let channels: string[];
        try {
          const parsed = JSON.parse(parsedChannels);
          channels = Array.isArray(parsed) ? parsed : [parsedChannels];
        } catch {
          channels = [parsedChannels];
        }

        const currencySymbols: Record<string, string> = {
          USD: '$', EUR: '€', COP: '$', VES: 'Bs.', MXN: '$', ARS: '$', PEN: 'S/.', CLP: '$', BRL: 'R$',
        };
        const sym = currencySymbols[String(currency || 'USD')] || '$';
        const invoiceMsg = `${String(concept)} - ${sym}${Number(amount).toLocaleString('es', { minimumFractionDigits: 2 })}${dueDate ? ` - Vence: ${dueDate}` : ''}${message ? `\n${message}` : ''}`;

        for (const ch of channels) {
          await db.notificationQueue.create({
            data: {
              businessId: user.businessId,
              customerId,
              channel: ch,
              subject: `📋 Nueva Cobranza: ${String(concept)}`,
              message: invoiceMsg,
              status: 'pending',
            },
          });
        }
      } catch (notifError) {
        console.error('Error queuing invoice notification:', notifError);
        // Don't fail the invoice creation if notification queuing fails
      }
    }

    // Return plain object to avoid Prisma serialization issues
    const data = {
      id: invoice.id,
      businessId: invoice.businessId,
      customerId: invoice.customerId,
      customerName: invoice.customerName,
      concept: invoice.concept,
      amount: invoice.amount,
      currency: invoice.currency,
      status: invoice.status,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      dueHour: invoice.dueHour,
      message: invoice.message,
      notifyChannels: invoice.notifyChannels,
      createdAt: invoice.createdAt.toISOString(),
      updatedAt: invoice.updatedAt.toISOString(),
    };

    return Response.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error('Create invoice error:', error);
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return Response.json({ error: 'Error interno del servidor', details: msg }, { status: 500 });
  }
}
