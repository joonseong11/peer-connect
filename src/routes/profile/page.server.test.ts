import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryBuilder, createSupabaseFromQueue } from '../../test/support/supabase';
import { createFormRequest, expectRedirect } from '../../test/support/sveltekit';

const { hasProfileEmailColumn } = vi.hoisted(() => ({
  hasProfileEmailColumn: vi.fn()
}));

vi.mock('$lib/server/profileEmailColumn', () => ({
  hasProfileEmailColumn
}));

const session = {
  user: {
    id: 'user-1',
    email: 'User@Example.com',
    user_metadata: {}
  }
} as any;

describe('/profile server', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('redirects unauthenticated users from the profile page', async () => {
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

  it('returns validation errors for missing required fields and invalid contact info', async () => {
    hasProfileEmailColumn.mockResolvedValue(false);

    const supabase = createSupabaseFromQueue([
      {
        table: 'profiles',
        builder: createQueryBuilder({
          maybeSingle: { data: null, error: null }
        })
      }
    ]);
    (supabase as any).auth = {
      updateUser: vi.fn()
    };

    const { actions } = await import('./+page.server');
    const result = await actions.default({
      request: createFormRequest({
        full_name: '',
        role: '',
        career_history: '',
        introduction: '',
        contact_linkedin: 'not-a-url',
        contact_github: 'still-not-a-url',
        contact_email: 'broken-email'
      }),
      locals: {
        getSession: vi.fn().mockResolvedValue(session),
        supabase
      },
      url: new URL('http://localhost/profile')
    } as any);

    expect(result).toMatchObject({
      status: 400,
      data: {
        success: false,
        errors: {
          full_name: '이름을 입력해주세요.',
          role: '직군 또는 포지션을 입력해주세요.',
          introduction: '소개를 입력해주세요.',
          contact_linkedin: '유효한 URL을 입력해주세요.',
          contact_github: '유효한 URL을 입력해주세요.',
          contact_email: '유효한 이메일 주소를 입력해주세요.'
        }
      }
    });
    expect((supabase as any).auth.updateUser).not.toHaveBeenCalled();
  });

  it('creates a profile with normalized email and respects the next redirect target', async () => {
    hasProfileEmailColumn.mockResolvedValue(true);

    const insertBuilder = createQueryBuilder({
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
        builder: insertBuilder
      }
    ]);
    (supabase as any).auth = {
      updateUser: vi.fn().mockResolvedValue({ error: null })
    };

    const { actions } = await import('./+page.server');

    await expectRedirect(
      () =>
        actions.default({
          request: createFormRequest({
            full_name: '김개발',
            role: 'Backend Engineer',
            career_history: '이력',
            introduction: '충분히 긴 자기소개입니다.',
            contact_linkedin: 'https://linkedin.com/in/dev',
            contact_github: 'https://github.com/dev',
            contact_email: 'contact@example.com'
          }),
          locals: {
            getSession: vi.fn().mockResolvedValue(session),
            supabase
          },
          url: new URL('http://localhost/profile?next=/members')
        } as any),
      303,
      '/members'
    );

    expect(insertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        full_name: '김개발',
        role: 'Backend Engineer',
        email: 'user@example.com',
        contact_email: 'contact@example.com',
        profile_completed_at: expect.any(String)
      })
    );
  });
});
