import { db } from '@/lib/db';
import { getAuthUser, extractTokenFromHeader } from '@/lib/auth';
import type { UpdateBusinessPayload } from '@/lib/types';

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

    const business = await db.business.findUnique({
      where: { id: user.businessId },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logo: true,
        email: true,
        phone: true,
        address: true,
        color: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            customers: true,
            staff: true,
            rewards: true,
            transactions: true,
          },
        },
      },
    });

    if (!business) {
      return Response.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

    return Response.json({ success: true, data: business });
  } catch (error) {
    console.error('Get business error:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
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

    const body: UpdateBusinessPayload = await request.json();
    const { name, description, email, phone, address, color, logo } = body;

    // At least one field must be provided
    if (!name && !description && !email && !phone && !address && !color && !logo) {
      return Response.json(
        { error: 'Debe proporcionar al menos un campo para actualizar' },
        { status: 400 }
      );
    }

    // Validate color format if provided
    if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return Response.json(
        { error: 'Formato de color inválido. Use formato HEX (#RRGGBB)' },
        { status: 400 }
      );
    }

    const updatedBusiness = await db.business.update({
      where: { id: user.businessId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(email && { email }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
        ...(color && { color }),
        ...(logo !== undefined && { logo }),
      },
    });

    return Response.json({ success: true, data: updatedBusiness });
  } catch (error) {
    console.error('Update business error:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
