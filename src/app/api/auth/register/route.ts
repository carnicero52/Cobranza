import { db } from '@/lib/db';
import { hashPassword, signToken } from '@/lib/auth';
import type { RegisterPayload } from '@/lib/types';

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const suffix = Math.random().toString(36).substring(2, 8);
  return `${base}-${suffix}`;
}

export async function POST(request: Request) {
  try {
    const body: RegisterPayload = await request.json();

    const { businessName, name, email, password, phone } = body;

    // Validate required fields
    if (!businessName || !name || !email || !password) {
      return Response.json(
        { error: 'Todos los campos son obligatorios' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return Response.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    if (businessName.length < 2) {
      return Response.json(
        { error: 'El nombre del negocio debe tener al menos 2 caracteres' },
        { status: 400 }
      );
    }

    // Check if email already exists across any business
    const existingStaff = await db.staff.findFirst({
      where: { email },
    });

    if (existingStaff) {
      return Response.json(
        { error: 'Este email ya está registrado' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create Business, Settings, and Admin Staff in a transaction
    const result = await db.$transaction(async (tx) => {
      const business = await tx.business.create({
        data: {
          name: businessName,
          slug: generateSlug(businessName),
          email,
          phone: phone || null,
        },
      });

      const settings = await tx.businessSettings.create({
        data: {
          businessId: business.id,
        },
      });

      const staff = await tx.staff.create({
        data: {
          name,
          email,
          passwordHash,
          role: 'admin',
          businessId: business.id,
        },
      });

      return { business, settings, staff };
    });

    // Generate JWT token
    const token = signToken({
      staffId: result.staff.id,
      businessId: result.business.id,
      role: 'admin',
    });

    const user = {
      id: result.staff.id,
      name: result.staff.name,
      email: result.staff.email,
      role: 'admin' as const,
      businessId: result.business.id,
      businessName: result.business.name,
      businessSlug: result.business.slug,
    };

    return Response.json(
      { token, user },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return Response.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
