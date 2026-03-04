import { NextResponse } from 'next/server';
import { createAuthClient } from '@/lib/db';

export async function POST() {
  try {
    const supabase = await createAuthClient();
    await supabase.auth.signOut();
    return NextResponse.json({ message: '로그아웃 완료' });
  } catch (err: unknown) {
    console.error('[auth/logout]', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
