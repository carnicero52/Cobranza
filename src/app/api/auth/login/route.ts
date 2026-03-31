import { db } from '@/lib/db';
import { verifyPassword, signToken } from '@/lib/auth';
import type { LoginPayload } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const body: LoginPayload = await request.json();

    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return Response.json(
        { error: 'Email y contraseña son obligatorios' },
        { status: 400 }
      );
    }

    // Find staff by email
    const staff = await db.staff.findFirst({
      where: { email },
      include: { business: true },
    });

    if (!staff) {
      return Response.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, staff.passwordHash);
    if (!isValid) {
      return Response.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    // Check staff is active
    if (!staff.active) {
      return Response.json(
        { error: 'Cuenta desactivada. Contacta al administrador.' },
        { status: 403 }
      );
    }

    // Check business is active
    if (!staff.business.active) {
      return Response.json(
        { error: 'Negocio desactivado. Contacta soporte.' },
        { status: 403 }
      );
    }

    // Generate JWT token
    const token = signToken({
      staffId: staff.id,
      businessId: staff.businessId,
      role: staff.role,
    });

    const user = {
      id: staff.id,
      name: staff.name,
      email: staff.email,
      role: staff.role as 'admin' | 'staff',
      businessId: staff.businessId,
      businessName: staff.business.name,
      businessSlug: staff.business.slug,
    };

    return Response.json({ token, user });
  } catch (error) {
    console.error('Login error:', error);
    return Response.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
