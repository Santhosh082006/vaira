import { NextResponse } from 'next/server';
import { calculateDynamicReorderPoints } from '@/lib/services/demandForecasting';

export async function GET() {
  try {
    const results = await calculateDynamicReorderPoints();
    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
