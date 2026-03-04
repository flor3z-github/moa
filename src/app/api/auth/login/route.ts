import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createServiceClient } from '@/lib/db';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { nickname, pin } = await request.json();

    if (!nickname || !pin) {
      return NextResponse.json({ error: '닉네임과 PIN을 입력해주세요.' }, { status: 400 });
    }

    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: 'PIN은 4자리 숫자여야 합니다.' }, { status: 400 });
    }

    const trimmed = nickname.trim();
    if (trimmed.length < 1 || trimmed.length > 20) {
      return NextResponse.json({ error: '닉네임은 1~20자여야 합니다.' }, { status: 400 });
    }

    const password = `moa-pin-${pin}-secure`;
    const admin = createServiceClient();

    // 같은 닉네임을 가진 유저들 조회
    const { data: listing } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const sameNickname = (listing?.users ?? []).filter(
      (u) => u.user_metadata?.nickname === trimmed
    );

    // 쿠키 기반 Supabase 클라이언트 (세션 설정용)
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

    // 기존 유저들에게 로그인 시도
    for (const user of sameNickname) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password,
      });

      if (!error && data.user) {
        const tag = data.user.user_metadata?.tag ?? '0001';
        return NextResponse.json({
          user: { id: data.user.id, nickname: trimmed, tag },
          isNew: false,
        });
      }
    }

    // 매칭 없음 → 새 유저 생성
    const existingTags = sameNickname
      .map((u) => parseInt(u.user_metadata?.tag ?? '0', 10))
      .filter((n) => !isNaN(n));
    const nextTag = String((existingTags.length > 0 ? Math.max(...existingTags) : 0) + 1).padStart(4, '0');
    const email = `${trimmed}.${nextTag}@moa.local`;

    const { error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nickname: trimmed, tag: nextTag },
    });

    if (createError) throw createError;

    // 생성 후 바로 로그인
    const { data: signIn, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) throw signInError;

    return NextResponse.json({
      user: { id: signIn.user.id, nickname: trimmed, tag: nextTag },
      isNew: true,
    });
  } catch (err: unknown) {
    console.error('[auth/login]', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
