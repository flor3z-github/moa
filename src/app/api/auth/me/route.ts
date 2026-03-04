import { NextResponse } from 'next/server';
import { createAuthClient } from '@/lib/db';

export async function GET() {
  try {
    const supabase = await createAuthClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ user: null });
    }

    const nickname = user.user_metadata?.nickname ?? '';
    const tag = user.user_metadata?.tag ?? '0001';

    return NextResponse.json(
      {
        user: {
          id: user.id,
          nickname,
          tag,
          displayName: `${nickname}#${tag}`,
        },
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=300, stale-while-revalidate=600',
        },
      }
    );
  } catch {
    return NextResponse.json({ user: null });
  }
}
