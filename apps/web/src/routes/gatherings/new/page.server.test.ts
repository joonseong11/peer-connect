import { describe, expect, it, vi } from 'vitest';
import { createQueryBuilder, createSupabaseFromQueue } from '../../../test/support/supabase';
import { createFormRequest, expectRedirect } from '../../../test/support/sveltekit';

describe('/gatherings/new server', () => {
  it('redirects unauthenticated users away from the page load', async () => {
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

  it('returns validation errors when the title or content is too short', async () => {
    const { actions } = await import('./+page.server');
    const session = {
      user: { id: 'user-1' }
    } as any;

    const result = await actions.create({
      request: createFormRequest({
        title: '짧음',
        content: '너무 짧음'
      }),
      locals: {
        getSession: vi.fn().mockResolvedValue(session),
        supabase: { from: vi.fn() }
      }
    } as any);

    expect(result).toMatchObject({
      status: 400,
      data: {
        success: false,
        errors: {
          title: '제목은 최소 5자 이상 입력해주세요.',
          content: '내용은 최소 20자 이상 입력해주세요.'
        }
      }
    });
  });

  it('returns a server error when creating the post fails', async () => {
    const { actions } = await import('./+page.server');
    const session = {
      user: { id: 'user-1' }
    } as any;
    const supabase = createSupabaseFromQueue([
      {
        table: 'gatherings',
        builder: createQueryBuilder({
          single: { data: null, error: { message: 'insert failed' } }
        })
      }
    ]);

    const result = await actions.create({
      request: createFormRequest({
        title: '충분히 긴 제목',
        content: '충분히 긴 내용입니다. 열아홉 자보다 깁니다.'
      }),
      locals: {
        getSession: vi.fn().mockResolvedValue(session),
        supabase
      }
    } as any);

    expect(result).toMatchObject({
      status: 500,
      data: {
        success: false,
        serverMessage: '모임 게시글을 등록하지 못했습니다. 잠시 후 다시 시도해주세요.'
      }
    });
  });

  it('redirects to the created gathering detail page on success', async () => {
    const { actions } = await import('./+page.server');
    const session = {
      user: { id: 'user-1' }
    } as any;
    const insertBuilder = createQueryBuilder({
      single: { data: { id: 'gathering-1' }, error: null }
    });
    const supabase = createSupabaseFromQueue([
      {
        table: 'gatherings',
        builder: insertBuilder
      }
    ]);

    await expectRedirect(
      () =>
        actions.create({
          request: createFormRequest({
            title: '충분히 긴 제목',
            content: '충분히 긴 내용입니다. 열아홉 자보다 깁니다.'
          }),
          locals: {
            getSession: vi.fn().mockResolvedValue(session),
            supabase
          }
        } as any),
      303,
      '/gatherings/gathering-1'
    );

    expect(insertBuilder.insert).toHaveBeenCalledWith({
      title: '충분히 긴 제목',
      content: '충분히 긴 내용입니다. 열아홉 자보다 깁니다.',
      author_id: 'user-1',
      email_sent: false
    });
  });
});
