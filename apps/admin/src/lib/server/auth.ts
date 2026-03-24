import { dev } from '$app/environment';

export const ADMIN_ONLY_MESSAGE = '관리자 권한이 있는 계정만 admin 앱에 접근할 수 있습니다.';

export const isLocalHost = (hostname: string) => hostname === '127.0.0.1' || hostname === 'localhost';

export const isLocalDevAuthEnabled = (url: URL) => dev && isLocalHost(url.hostname);

export const normalizeEmail = (value: FormDataEntryValue | string | null | undefined) =>
  value?.toString().trim().toLowerCase() ?? '';

export const getSafeNextPath = (value: string | null | undefined) =>
  value && value.startsWith('/') ? value : '/';

export const buildAuthCallbackUrl = (url: URL, nextPath: string) => {
  const callbackUrl = new URL('/auth/callback', url.origin);

  if (nextPath !== '/') {
    callbackUrl.searchParams.set('next', nextPath);
  }

  return callbackUrl.toString();
};
