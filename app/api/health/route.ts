import { NextResponse } from 'next/server';

/**
 * Liveness only: reports that the app process is up and serving. Deliberately
 * touches no external service, so a database outage cannot cause a restart
 * loop of an otherwise healthy container.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    { ok: true, service: 'koreokorp-app' },
    { headers: { 'cache-control': 'no-store' } },
  );
}