import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { nickname, pin } = await request.json();

    if (!nickname || !pin) {
      return NextResponse.json({ error: '닉네임과 PIN을 입력해주세요.' }, { status: 400 });
    }

    const email = `${nickname}@moa.local`;
    const password = `moa-pin-${pin}-secure`;

    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          },
        },
      }
    );

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json(
        { error: '닉네임 또는 PIN이 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      message: '로그인 성공',
      user: {
        id: data.user.id,
        nickname: data.user.user_metadata?.nickname ?? nickname,
      },
    });
  } catch (err: unknown) {
    console.error('[auth/login]', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
