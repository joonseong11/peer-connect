import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryBuilder, createSupabaseFromQueue } from '../../../test/support/supabase';
import { createCookies, createFormRequest, expectRedirect } from '../../../test/support/sveltekit';

const { hasProfileEmailColumn, notifyEndorsementReceived, getSupabaseAdminClient, redeemInviteCode } =
  vi.hoisted(() => ({
    hasProfileEmailColumn: vi.fn(),
    notifyEndorsementReceived: vi.fn(),
    getSupabaseAdminClient: vi.fn(),
    redeemInviteCode: vi.fn()
  }));

vi.mock('$lib/server/profileEmailColumn', () => ({
  hasProfileEmailColumn
}));

vi.mock('$lib/server/notifications', () => ({
  notifyEndorsementReceived
}));

vi.mock('$lib/server/supabaseAdmin', () => ({
  getSupabaseAdminClient
}));

vi.mock('$lib/server/invite', () => ({
  redeemInviteCode
}));

const session = {
  user: {
    id: 'viewer-1',
    user_metadata: {
      full_name: '뷰어'
    }
  }
} as any;

describe('/members/[userId]', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    hasProfileEmailColumn.mockResolvedValue(false);
    notifyEndorsementReceived.mockResolvedValue(undefined);
    getSupabaseAdminClient.mockReturnValue(null);
    redeemInviteCode.mockResolvedValue({
      success: false,
      status: 400,
      reason: 'invalid',
      message: 'invalid'
    });
  });

  it('silently redeems pending invite codes and redirects on success', async () => {
    redeemInviteCode.mockResolvedValue({
      success: true,
      redirectTo: '/profile?onboarding=seed'
    });
    const { load } = await import('./+page.server');
    const cookies = createCookies({ pending_invite_code: 'INVITE42' });

    await expectRedirect(
      () =>
        load({
          locals: {
            getSession: vi.fn().mockResolvedValue(session),
            supabase: {}
          },
          params: { userId: 'target-1' },
          url: new URL('http://localhost/members/target-1'),
          cookies
        } as any),
      303,
      '/profile?onboarding=seed'
    );

    expect(cookies.delete).toHaveBeenCalledWith('pending_invite_code', { path: '/' });
  });

  it('returns a load error when the target profile cannot be loaded', async () => {
    const { load } = await import('./+page.server');
    const supabase = createSupabaseFromQueue([
      {
        table: 'profiles',
        builder: createQueryBuilder({
          maybeSingle: { data: null, error: { message: 'boom' } }
        })
      }
    ]);

    await expect(
      load({
        locals: { getSession: vi.fn().mockResolvedValue(session), supabase },
        params: { userId: 'target-1' },
        url: new URL('http://localhost/members/target-1'),
        cookies: createCookies()
      } as any)
    ).resolves.toEqual({
      session,
      profile: null,
      endorsements: [],
      existingEndorsementId: null,
      statusMessage: null,
      loadError: '프로필을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'
    });
  });

  it('redirects to the members list when the target profile is missing', async () => {
    const { load } = await import('./+page.server');
    const supabase = createSupabaseFromQueue([
      {
        table: 'profiles',
        builder: createQueryBuilder({
          maybeSingle: { data: null, error: null }
        })
      }
    ]);

    await expectRedirect(
      () =>
        load({
          locals: { getSession: vi.fn().mockResolvedValue(session), supabase },
          params: { userId: 'target-1' },
          url: new URL('http://localhost/members/target-1'),
          cookies: createCookies()
        } as any),
      303,
      '/members'
    );
  });

  it('loads the profile page and resolves the current endorsement state', async () => {
    const { load } = await import('./+page.server');
    const supabase = createSupabaseFromQueue([
      {
        table: 'profiles',
        builder: createQueryBuilder({
          maybeSingle: {
            data: { user_id: 'target-1', full_name: '타깃', role: 'Engineer' },
            error: null
          }
        })
      },
      {
        table: 'endorsements',
        builder: createQueryBuilder({
          awaited: {
            data: [{ id: 'endorsement-1', content: '좋은 동료입니다.' }],
            error: null
          }
        })
      },
      {
        table: 'endorsements',
        builder: createQueryBuilder({
          maybeSingle: { data: { id: 'mine-1' }, error: null }
        })
      }
    ]);

    await expect(
      load({
        locals: { getSession: vi.fn().mockResolvedValue(session), supabase },
        params: { userId: 'target-1' },
        url: new URL('http://localhost/members/target-1?endorsementStatus=prompt'),
        cookies: createCookies()
      } as any)
    ).resolves.toMatchObject({
      session,
      profile: { user_id: 'target-1', full_name: '타깃', role: 'Engineer' },
      endorsements: [{ id: 'endorsement-1', content: '좋은 동료입니다.' }],
      existingEndorsementId: 'mine-1',
      statusMessage: '나를 초대한 동료에게 첫 추천을 남겨보세요!',
      loadError: null
    });
  });

  it('validates endorsement creation requests', async () => {
    const { actions } = await import('./+page.server');

    await expect(
      actions.endorse({
        request: createFormRequest({ content: '짧음' }),
        locals: { getSession: vi.fn().mockResolvedValue(session), supabase: {} },
        params: { userId: 'target-1' }
      } as any)
    ).resolves.toMatchObject({
      status: 400,
      data: {
        errors: { content: '추천/칭찬은 최소 20자 이상 작성해주세요.' }
      }
    });

    await expect(
      actions.endorse({
        request: createFormRequest({ content: '충분히 길지만 자기 자신에게 보냅니다.' }),
        locals: { getSession: vi.fn().mockResolvedValue(session), supabase: {} },
        params: { userId: 'viewer-1' }
      } as any)
    ).resolves.toMatchObject({
      status: 400,
      data: {
        errors: { content: '본인 프로필에는 추천서를 남길 수 없습니다.' }
      }
    });
  });

  it('rejects duplicate endorsements and insert failures', async () => {
    const { actions } = await import('./+page.server');
    const duplicateSupabase = createSupabaseFromQueue([
      {
        table: 'endorsements',
        builder: createQueryBuilder({
          maybeSingle: { data: { id: 'existing-1' }, error: null }
        })
      }
    ]);

    await expect(
      actions.endorse({
        request: createFormRequest({ content: '충분히 긴 추천 내용입니다. 매우 훌륭합니다.' }),
        locals: { getSession: vi.fn().mockResolvedValue(session), supabase: duplicateSupabase },
        params: { userId: 'target-1' }
      } as any)
    ).resolves.toMatchObject({
      status: 400,
      data: {
        errors: {
          content: '이미 이 동료에게 작성한 추천이 있습니다. 삭제 후 다시 작성할 수 있어요.'
        }
      }
    });

    const failingSupabase = createSupabaseFromQueue([
      {
        table: 'endorsements',
        builder: createQueryBuilder({
          maybeSingle: { data: null, error: null }
        })
      },
      {
        table: 'endorsements',
        builder: createQueryBuilder({
          awaited: { error: { message: 'insert failed' } }
        })
      }
    ]);

    await expect(
      actions.endorse({
        request: createFormRequest({ content: '충분히 긴 추천 내용입니다. 매우 훌륭합니다.' }),
        locals: { getSession: vi.fn().mockResolvedValue(session), supabase: failingSupabase },
        params: { userId: 'target-1' }
      } as any)
    ).resolves.toMatchObject({
      status: 500,
      data: {
        serverMessage: '추천을 저장하는 중 문제가 발생했습니다.'
      }
    });
  });

  it('creates an endorsement, sends notifications, and redirects', async () => {
    hasProfileEmailColumn.mockResolvedValue(true);
    const adminClient = createSupabaseFromQueue([
      {
        table: 'profiles',
        builder: createQueryBuilder({
          maybeSingle: {
            data: { user_id: 'target-1', full_name: '타깃', email: 'target@example.com' },
            error: null
          }
        })
      }
    ]);
    getSupabaseAdminClient.mockReturnValue(adminClient);

    const supabase = createSupabaseFromQueue([
      {
        table: 'endorsements',
        builder: createQueryBuilder({
          maybeSingle: { data: null, error: null }
        })
      },
      {
        table: 'endorsements',
        builder: createQueryBuilder({
          awaited: { error: null }
        })
      },
      {
        table: 'profiles',
        builder: createQueryBuilder({
          maybeSingle: {
            data: { full_name: '뷰어 실명' },
            error: null
          }
        })
      }
    ]);

    const { actions } = await import('./+page.server');

    await expectRedirect(
      () =>
        actions.endorse({
          request: createFormRequest({ content: '충분히 긴 추천 내용입니다. 매우 훌륭합니다.' }),
          locals: { getSession: vi.fn().mockResolvedValue(session), supabase },
          params: { userId: 'target-1' }
        } as any),
      303,
      '/members/target-1?endorsementStatus=created'
    );

    expect(notifyEndorsementReceived).toHaveBeenCalledWith({
      target: {
        email: 'target@example.com',
        name: '타깃',
        userId: 'target-1'
      },
      authorName: '뷰어 실명',
      content: '충분히 긴 추천 내용입니다. 매우 훌륭합니다.'
    });
  });

  it('validates endorsement deletion and redirects on success', async () => {
    const { actions } = await import('./+page.server');

    await expect(
      actions.delete({
        request: createFormRequest({}),
        locals: { getSession: vi.fn().mockResolvedValue(session), supabase: {} },
        params: { userId: 'target-1' }
      } as any)
    ).resolves.toMatchObject({
      status: 400,
      data: { deleteError: '삭제할 추천을 찾을 수 없습니다.' }
    });

    const deleteFailSupabase = createSupabaseFromQueue([
      {
        table: 'endorsements',
        builder: createQueryBuilder({
          awaited: { error: { message: 'delete failed' } }
        })
      }
    ]);

    await expect(
      actions.delete({
        request: createFormRequest({ endorsementId: 'endorsement-1' }),
        locals: { getSession: vi.fn().mockResolvedValue(session), supabase: deleteFailSupabase },
        params: { userId: 'target-1' }
      } as any)
    ).resolves.toMatchObject({
      status: 500,
      data: { deleteError: '추천을 삭제하지 못했습니다. 잠시 후 다시 시도해주세요.' }
    });

    const deleteSuccessSupabase = createSupabaseFromQueue([
      {
        table: 'endorsements',
        builder: createQueryBuilder({
          awaited: { error: null }
        })
      }
    ]);

    await expectRedirect(
      () =>
        actions.delete({
          request: createFormRequest({ endorsementId: 'endorsement-1' }),
          locals: { getSession: vi.fn().mockResolvedValue(session), supabase: deleteSuccessSupabase },
          params: { userId: 'target-1' }
        } as any),
      303,
      '/members/target-1?endorsementStatus=deleted'
    );
  });
});
