import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const user = await prisma.user.updateMany({
      where: { email: 'admin@vaira.app' },
      data: { role: 'ADMIN' }
    });
    return NextResponse.json({ success: true, updated: user.count });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
