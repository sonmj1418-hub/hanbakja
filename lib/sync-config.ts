/**
 * 모든 설치가 같은 Supabase 프로젝트를 쓴다.
 * 릴리스에 구워 넣는 publishable 키다. service role 키는 여기 두지 않는다.
 * 주소나 키가 비어 있으면 앱은 기록을 올리지 않는다.
 */
export const SUPABASE_URL = "https://zpmkgmqqdrtuefqejtbm.supabase.co";

export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_E_1gv1tEXLxbT8OBTw8CKw_ZH0HlIzK";

export type SyncConfig = {
  url: string;
  anonKey: string;
};

export function bakedSyncConfig(): SyncConfig {
  return {
    url: SUPABASE_URL.trim(),
    anonKey: SUPABASE_PUBLISHABLE_KEY.trim(),
  };
}
