import { createAuthClient } from '@/lib/db';

/** API Route에서 인증된 유저 ID를 가져오는 헬퍼. 미인증시 null 반환. */
export async function getAuthUserId(): Promise<string | null> {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}
