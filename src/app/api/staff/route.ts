import { db } from '@/lib/db';
import { getAuthUser, extractTokenFromHeader } from '@/lib/auth';
import { hashPassword } from '@/lib/auth';
import type { CreateStaffPayload } from '@/lib/types';

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

    // Admin only
    if (user.role !== 'admin') {
      return Response.json(
        { error: 'Solo los administradores pueden ver el personal' },
        { status: 403 }
      );
    }

    const staffList = await db.staff.findMany({
      where: {
        businessId: user.businessId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return Response.json({ success: true, data: staffList });
  } catch (error) {
    console.error('List staff error:', error);
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

    // Admin only
    if (user.role !== 'admin') {
      return Response.json(
        { error: 'Solo los administradores pueden crear personal' },
        { status: 403 }
      );
    }

    const body: CreateStaffPayload = await request.json();
    const { name, email, password, role } = body;

    // Validate required fields
    if (!name || !email || !password) {
      return Response.json(
        { error: 'Nombre, email y contraseña son obligatorios' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return Response.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    if (!role || (role !== 'admin' && role !== 'staff')) {
      return Response.json(
        { error: 'El rol debe ser "admin" o "staff"' },
        { status: 400 }
      );
    }

    // Check unique constraint [email, businessId]
    const existingStaff = await db.staff.findUnique({
      where: {
        email_businessId: {
          email,
          businessId: user.businessId,
        },
      },
    });

    if (existingStaff) {
      return Response.json(
        { error: 'Este email ya está registrado en tu negocio' },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    const staff = await db.staff.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        businessId: user.businessId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return Response.json({ success: true, data: staff }, { status: 201 });
  } catch (error) {
    console.error('Create staff error:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
