import { NextResponse } from 'next/server';
import { createAuthClient } from '@/lib/db';

export async function GET() {
  try {
    const supabase = await createAuthClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        nickname: user.user_metadata?.nickname ?? '',
      },
    });
  } catch {
    return NextResponse.json({ user: null });
  }
}
