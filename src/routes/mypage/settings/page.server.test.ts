import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryBuilder, createSupabaseFromQueue } from '../../../test/support/supabase';
import { expectRedirect } from '../../../test/support/sveltekit';

const { getSupabaseAdminClient, hasProfileEmailColumn } = vi.hoisted(() => ({
  getSupabaseAdminClient: vi.fn(),
  hasProfileEmailColumn: vi.fn()
}));

vi.mock('$lib/server/supabaseAdmin', () => ({
  getSupabaseAdminClient
}));

vi.mock('$lib/server/profileEmailColumn', () => ({
  hasProfileEmailColumn
}));

const session = {
  user: {
    id: 'user-1',
    email: 'User@Example.com',
    user_metadata: {
      full_name: '김개발',
      title: 'Backend Engineer'
    }
  }
} as any;

const createPreferencesRequest = (entries: Array<[string, string]>) => {
  const formData = new FormData();

  for (const [key, value] of entries) {
    formData.append(key, value);
  }

  return new Request('http://localhost/mypage/settings', {
    method: 'POST',
    body: formData
  });
};

describe('/mypage/settings server', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('redirects unauthenticated users from the settings page', async () => {
    const { load } = await import('./+page.server');

    await expectRedirect(
      () =>
        load({
          locals: {
            getSession: vi.fn().mockResolvedValue(null)
          }
        } as any),
      303,
      '/?authError=signin-required'
    );
  });

  it('creates a default profile and updates parsed notification preferences', async () => {
    hasProfileEmailColumn.mockResolvedValue(true);
    getSupabaseAdminClient.mockReturnValue({});

    const createProfileBuilder = createQueryBuilder({
      awaited: { error: null }
    });
    const updateBuilder = createQueryBuilder({
      awaited: { error: null }
    });
    const supabase = createSupabaseFromQueue([
      {
        table: 'profiles',
        builder: createQueryBuilder({
          maybeSingle: { data: null, error: null }
        })
      },
      {
        table: 'profiles',
        builder: createProfileBuilder
      },
      {
        table: 'profiles',
        builder: updateBuilder
      }
    ]);

    const { actions } = await import('./+page.server');
    const result = await actions.updatePreferences({
      request: createPreferencesRequest([
        ['notify_endorsements', 'false'],
        ['notify_endorsements', 'true'],
        ['notify_gatherings', 'false'],
        ['notify_comments', 'false'],
        ['notify_comments', 'true']
      ]),
      locals: {
        getSession: vi.fn().mockResolvedValue(session),
        supabase
      }
    } as any);

    expect(createProfileBuilder.insert).toHaveBeenCalledWith({
      user_id: 'user-1',
      full_name: '김개발',
      role: 'Backend Engineer',
      email: 'user@example.com'
    });
    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        notify_endorsements: true,
        notify_gatherings: false,
        notify_comments: true,
        email: 'user@example.com'
      })
    );
    expect(result).toEqual({
      success: true,
      preferences: {
        endorsements: true,
        gatherings: false,
        comments: true
      },
      message: '알림 설정을 저장했습니다.'
    });
  });

  it('returns a specific error when notification columns are missing', async () => {
    hasProfileEmailColumn.mockResolvedValue(false);

    const updateBuilder = createQueryBuilder({
      awaited: { error: { code: '42703' } }
    });
    const supabase = createSupabaseFromQueue([
      {
        table: 'profiles',
        builder: createQueryBuilder({
          maybeSingle: { data: { user_id: 'user-1' }, error: null }
        })
      },
      {
        table: 'profiles',
        builder: updateBuilder
      }
    ]);

    const { actions } = await import('./+page.server');
    const result = await actions.updatePreferences({
      request: createPreferencesRequest([['notify_endorsements', 'false']]),
      locals: {
        getSession: vi.fn().mockResolvedValue(session),
        supabase
      }
    } as any);

    expect(result).toMatchObject({
      status: 500,
      data: {
        preferences: {
          endorsements: false,
          gatherings: true,
          comments: true
        },
        updateError:
          '알림 설정 컬럼이 준비되지 않았습니다. 데이터베이스에 notify_* 컬럼을 추가해주세요.'
      }
    });
  });

  it('returns an error when account deletion is attempted without an admin client', async () => {
    getSupabaseAdminClient.mockReturnValue(null);

    const { actions } = await import('./+page.server');
    const result = await actions.deleteAccount({
      locals: {
        getSession: vi.fn().mockResolvedValue(session)
      }
    } as any);

    expect(result).toMatchObject({
      status: 500,
      data: {
        deleteError:
          '계정 삭제를 완료하려면 서버 환경 변수 SUPABASE_SERVICE_ROLE_KEY를 설정해주세요.'
      }
    });
  });
});
