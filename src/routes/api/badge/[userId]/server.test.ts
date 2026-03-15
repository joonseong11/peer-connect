import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryBuilder, createSupabaseFromQueue } from '../../../../test/support/supabase';
import { expectHttpError } from '../../../../test/support/sveltekit';

const { getSupabaseAdminClient } = vi.hoisted(() => ({
  getSupabaseAdminClient: vi.fn()
}));

vi.mock('$lib/server/supabaseAdmin', () => ({
  getSupabaseAdminClient
}));

describe('/api/badge/[userId]', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('throws a 500 error when the admin client is unavailable', async () => {
    getSupabaseAdminClient.mockReturnValue(null);
    const { GET } = await import('./+server');

    await expectHttpError(
      () => GET({ params: { userId: 'user-1' } } as any),
      500,
      'Server configuration error'
    );
  });

  it('returns an error svg when the profile does not exist', async () => {
    const adminClient = createSupabaseFromQueue([
      {
        table: 'profiles',
        builder: createQueryBuilder({
          maybeSingle: { data: null, error: null }
        })
      }
    ]);
    getSupabaseAdminClient.mockReturnValue(adminClient);
    const { GET } = await import('./+server');

    const response = await GET({ params: { userId: 'user-1' } } as any);

    expect(response.headers.get('Content-Type')).toBe('image/svg+xml');
    await expect(response.text()).resolves.toContain('사용자를 찾을 수 없습니다.');
  });

  it('returns a cached svg badge for valid users', async () => {
    const adminClient = createSupabaseFromQueue([
      {
        table: 'profiles',
        builder: createQueryBuilder({
          maybeSingle: {
            data: { full_name: '김개발', role: 'Backend Engineer' },
            error: null
          }
        })
      },
      {
        table: 'endorsements',
        builder: createQueryBuilder({
          awaited: {
            count: 4,
            data: [
              {
                content: '정말 훌륭한 동료입니다.',
                created_at: '2026-03-15T10:00:00.000Z',
                author: { full_name: '추천인1', role: 'Engineer' }
              },
              {
                content: '협업이 매우 좋았습니다.',
                created_at: '2026-03-14T10:00:00.000Z',
                author: { full_name: '추천인2', role: 'Designer' }
              },
              {
                content: '문제를 끝까지 해결합니다.',
                created_at: '2026-03-13T10:00:00.000Z',
                author: { full_name: '추천인3', role: 'PM' }
              },
              {
                content: '추가 추천',
                created_at: '2026-03-12T10:00:00.000Z',
                author: { full_name: '추천인4', role: 'QA' }
              }
            ],
            error: null
          }
        })
      }
    ]);
    getSupabaseAdminClient.mockReturnValue(adminClient);
    const { GET } = await import('./+server');

    const response = await GET({ params: { userId: 'user-1' } } as any);
    const svg = await response.text();

    expect(response.headers.get('Cache-Control')).toBe('public, max-age=60, s-maxage=60');
    expect(svg).toContain('김개발');
    expect(svg).toContain('+ 1개의 추천서 더 보기');
  });
});
