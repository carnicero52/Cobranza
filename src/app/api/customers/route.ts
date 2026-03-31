import { db } from '@/lib/db';
import { getAuthUser, extractTokenFromHeader } from '@/lib/auth';
import type { CreateCustomerPayload } from '@/lib/types';

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
    const search = searchParams.get('search') || '';

    const customers = await db.customer.findMany({
      where: {
        businessId: user.businessId,
        ...(search && {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
          ],
        }),
      },
      orderBy: { registeredAt: 'desc' },
    });

    return Response.json({ success: true, data: customers });
  } catch (error) {
    console.error('List customers error:', error);
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

    const body: CreateCustomerPayload = await request.json();
    const { name, email, phone, telegramChatId, whatsappPhone } = body;

    // Validate required fields
    if (!name || !email) {
      return Response.json(
        { error: 'Nombre y email son obligatorios' },
        { status: 400 }
      );
    }

    if (name.length < 2) {
      return Response.json(
        { error: 'El nombre debe tener al menos 2 caracteres' },
        { status: 400 }
      );
    }

    // Check unique constraint [email, businessId]
    const existingCustomer = await db.customer.findUnique({
      where: {
        email_businessId: {
          email,
          businessId: user.businessId,
        },
      },
    });

    if (existingCustomer) {
      return Response.json(
        { error: 'Este email ya está registrado en tu negocio' },
        { status: 400 }
      );
    }

    const customer = await db.customer.create({
      data: {
        name,
        email,
        phone: phone || null,
        telegramChatId: telegramChatId || null,
        whatsappPhone: whatsappPhone || null,
        businessId: user.businessId,
      },
    });

    return Response.json({ success: true, data: customer }, { status: 201 });
  } catch (error) {
    console.error('Create customer error:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
