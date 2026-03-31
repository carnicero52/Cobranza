import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import type { AuthUser } from '@/lib/types';

const JWT_SECRET = process.env.JWT_SECRET || 'royalty-qr-secret-key-change-in-production';

export interface JwtPayload {
  staffId: string;
  businessId: string;
  role: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export async function getAuthUser(token: string): Promise<AuthUser | null> {
  const payload = verifyToken(token);
  if (!payload) return null;

  const staff = await db.staff.findUnique({
    where: { id: payload.staffId },
    include: { business: true },
  });

  if (!staff || !staff.active) return null;

  return {
    id: staff.id,
    name: staff.name,
    email: staff.email,
    role: staff.role as 'admin' | 'staff',
    businessId: staff.businessId,
    businessName: staff.business.name,
    businessSlug: staff.business.slug,
  };
}

export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}
