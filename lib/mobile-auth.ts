import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const SECRET = process.env.AUTH_SECRET ?? 'intkhab-alam-crm-secret-2024';

export function getMobileUser(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, SECRET) as any;
    return { id: decoded.id, name: decoded.name, email: decoded.email, role: decoded.role };
  } catch {
    return null;
  }
}
