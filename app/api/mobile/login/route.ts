import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getUserByEmail } from '@/lib/db';
import jwt from 'jsonwebtoken';

const SECRET = process.env.AUTH_SECRET ?? 'intkhab-alam-crm-secret-2024';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = jwt.sign(
      { id: String(user.id), name: user.name, email: user.email, role: user.role },
      SECRET,
      { expiresIn: '30d' }
    );

    return NextResponse.json({
      token,
      user: { id: String(user.id), name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error('Mobile login error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
