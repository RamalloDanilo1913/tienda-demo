import { NextResponse } from 'next/server';
import { resolverAdminDesdeRequest } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request) {
  try {
    const email = resolverAdminDesdeRequest(request);
    return NextResponse.json({ ok: true, email });
  } catch (err) {
    return NextResponse.json({ ok: false, mensaje: err.message }, { status: err.status || 401 });
  }
}
