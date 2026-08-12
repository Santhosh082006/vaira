import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 });
  }

  try {
    const passwordHash = await bcrypt.hash('password', 10);
    const admin = await prisma.user.upsert({
      where: { email: 'admin@vaira.app' },
      update: {},
      create: {
        email: 'admin@vaira.app',
        name: 'System Admin',
        passwordHash,
        role: 'ADMIN',
      }
    });
    return NextResponse.json({ success: true, user: admin.email });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
