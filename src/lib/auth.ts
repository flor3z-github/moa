import { headers } from 'next/headers';
import { createAuthClient } from '@/lib/db';

/** API Route에서 인증된 유저 ID를 가져오는 헬퍼. 미인증시 null 반환. */
export async function getAuthUserId(): Promise<string | null> {
  // 미들웨어에서 검증 후 전달된 유저 ID 사용 (추가 Supabase 호출 불필요)
  const headersList = await headers();
  const userId = headersList.get('x-user-id');
  if (userId) return userId;

  // Fallback: 미들웨어를 거치지 않는 경우 직접 검증
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}
