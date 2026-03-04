import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { nickname, pin } = await request.json();

    if (!nickname || !pin) {
      return NextResponse.json({ error: '닉네임과 PIN을 입력해주세요.' }, { status: 400 });
    }

    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: 'PIN은 4자리 숫자여야 합니다.' }, { status: 400 });
    }

    if (nickname.length < 1 || nickname.length > 20) {
      return NextResponse.json({ error: '닉네임은 1~20자여야 합니다.' }, { status: 400 });
    }

    const email = `${nickname}@moa.local`;
    const password = `moa-pin-${pin}-secure`;

    const supabase = createServiceClient();

    // 중복 확인
    const { data: existing } = await supabase.auth.admin.listUsers();
    const duplicate = existing?.users?.find((u) => u.email === email);
    if (duplicate) {
      return NextResponse.json({ error: '이미 사용 중인 닉네임입니다.' }, { status: 409 });
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nickname },
    });

    if (error) throw error;

    return NextResponse.json(
      { message: '가입 완료! 로그인해주세요.', userId: data.user.id },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error('[auth/signup]', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
