import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryBuilder, createSupabaseFromQueue } from '../../../test/support/supabase';
import { createFormRequest, expectRedirect } from '../../../test/support/sveltekit';

const { hasProfileEmailColumn, notifyGatheringCommentReceived, getSupabaseAdminClient } =
  vi.hoisted(() => ({
    hasProfileEmailColumn: vi.fn(),
    notifyGatheringCommentReceived: vi.fn(),
    getSupabaseAdminClient: vi.fn()
  }));

vi.mock('$lib/server/profileEmailColumn', () => ({
  hasProfileEmailColumn
}));

vi.mock('$lib/server/notifications', () => ({
  notifyGatheringCommentReceived
}));

vi.mock('$lib/server/supabaseAdmin', () => ({
  getSupabaseAdminClient
}));

const session = {
  user: {
    id: 'user-1',
    user_metadata: {
      full_name: '댓글 작성자'
    }
  }
} as any;

describe('/gatherings/[gatheringId]', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    hasProfileEmailColumn.mockResolvedValue(false);
    notifyGatheringCommentReceived.mockResolvedValue(undefined);
    getSupabaseAdminClient.mockReturnValue(null);
  });

  it('redirects unauthenticated users from the page', async () => {
    const { load } = await import('./+page.server');

    await expectRedirect(
      () =>
        load({
          locals: { getSession: vi.fn().mockResolvedValue(null) },
          params: { gatheringId: 'gathering-1' }
        } as any),
      303,
      '/?authError=signin-required'
    );
  });

  it('redirects to the gatherings list when the post cannot be loaded', async () => {
    const { load } = await import('./+page.server');
    const supabase = createSupabaseFromQueue([
      {
        table: 'gatherings',
        builder: createQueryBuilder({
          maybeSingle: { data: null, error: { message: 'boom' } }
        })
      }
    ]);

    await expectRedirect(
      () =>
        load({
          locals: { getSession: vi.fn().mockResolvedValue(session), supabase },
          params: { gatheringId: 'gathering-1' }
        } as any),
      303,
      '/gatherings'
    );
  });

  it('builds a nested comment tree on successful load', async () => {
    const { load } = await import('./+page.server');
    const supabase = createSupabaseFromQueue([
      {
        table: 'gatherings',
        builder: createQueryBuilder({
          maybeSingle: {
            data: { id: 'gathering-1', title: '모임', content: '본문', author_id: 'author-1' },
            error: null
          }
        })
      },
      {
        table: 'gathering_comments',
        builder: createQueryBuilder({
          awaited: {
            data: [
              {
                id: 'comment-1',
                content: '부모 댓글',
                created_at: '2026-03-15T10:00:00.000Z',
                updated_at: null,
                author_id: 'author-2',
                parent_comment_id: null,
                author: { full_name: '첫 댓글', role: 'Engineer', photo_url: null }
              },
              {
                id: 'comment-2',
                content: '답글',
                created_at: '2026-03-15T11:00:00.000Z',
                updated_at: null,
                author_id: 'author-3',
                parent_comment_id: 'comment-1',
                author: { full_name: '둘째 댓글', role: 'Designer', photo_url: null }
              }
            ],
            error: null
          }
        })
      }
    ]);

    await expect(
      load({
        locals: { getSession: vi.fn().mockResolvedValue(session), supabase },
        params: { gatheringId: 'gathering-1' }
      } as any)
    ).resolves.toMatchObject({
      session,
      post: { id: 'gathering-1', title: '모임' },
      comments: [
        {
          id: 'comment-1',
          replies: [{ id: 'comment-2' }]
        }
      ],
      loadError: null
    });
  });

  it('enforces ownership and validation when updating or deleting posts', async () => {
    const { actions } = await import('./+page.server');
    const forbiddenSupabase = createSupabaseFromQueue([
      {
        table: 'gatherings',
        builder: createQueryBuilder({
          maybeSingle: { data: { id: 'gathering-1', author_id: 'other-user' }, error: null }
        })
      }
    ]);

    await expect(
      actions.updatePost({
        request: createFormRequest({ title: '충분한 제목', content: '충분한 본문입니다. 길이가 충분합니다.' }),
        locals: { getSession: vi.fn().mockResolvedValue(session), supabase: forbiddenSupabase },
        params: { gatheringId: 'gathering-1' }
      } as any)
    ).resolves.toMatchObject({
      status: 403,
      data: { serverMessage: '게시글을 수정할 권한이 없습니다.' }
    });

    const validationSupabase = createSupabaseFromQueue([
      {
        table: 'gatherings',
        builder: createQueryBuilder({
          maybeSingle: { data: { id: 'gathering-1', author_id: 'user-1' }, error: null }
        })
      }
    ]);

    await expect(
      actions.updatePost({
        request: createFormRequest({ title: '짧음', content: '짧음' }),
        locals: { getSession: vi.fn().mockResolvedValue(session), supabase: validationSupabase },
        params: { gatheringId: 'gathering-1' }
      } as any)
    ).resolves.toMatchObject({
      status: 400,
      data: {
        errors: {
          content: '내용은 최소 20자 이상 입력해주세요.'
        }
      }
    });

    const deleteForbiddenSupabase = createSupabaseFromQueue([
      {
        table: 'gatherings',
        builder: createQueryBuilder({
          maybeSingle: { data: { id: 'gathering-1', author_id: 'other-user' }, error: null }
        })
      }
    ]);

    await expect(
      actions.deletePost({
        locals: { getSession: vi.fn().mockResolvedValue(session), supabase: deleteForbiddenSupabase },
        params: { gatheringId: 'gathering-1' }
      } as any)
    ).resolves.toMatchObject({
      status: 403,
      data: { serverMessage: '게시글을 삭제할 권한이 없습니다.' }
    });
  });

  it('updates and deletes owned posts successfully', async () => {
    const { actions } = await import('./+page.server');
    const updateBuilder = createQueryBuilder({
      awaited: { error: null }
    });
    const updateSupabase = createSupabaseFromQueue([
      {
        table: 'gatherings',
        builder: createQueryBuilder({
          maybeSingle: { data: { id: 'gathering-1', author_id: 'user-1' }, error: null }
        })
      },
      {
        table: 'gatherings',
        builder: updateBuilder
      }
    ]);

    await expect(
      actions.updatePost({
        request: createFormRequest({
          title: '충분히 긴 제목',
          content: '충분히 긴 본문입니다. 수정도 잘 됩니다.'
        }),
        locals: { getSession: vi.fn().mockResolvedValue(session), supabase: updateSupabase },
        params: { gatheringId: 'gathering-1' }
      } as any)
    ).resolves.toEqual({
      intent: 'updatePost',
      success: true
    });

    expect(updateBuilder.update).toHaveBeenCalledWith({
      title: '충분히 긴 제목',
      content: '충분히 긴 본문입니다. 수정도 잘 됩니다.',
      updated_at: expect.any(String)
    });

    const deleteSupabase = createSupabaseFromQueue([
      {
        table: 'gatherings',
        builder: createQueryBuilder({
          maybeSingle: { data: { id: 'gathering-1', author_id: 'user-1' }, error: null }
        })
      },
      {
        table: 'gatherings',
        builder: createQueryBuilder({
          awaited: { error: null }
        })
      }
    ]);

    await expectRedirect(
      () =>
        actions.deletePost({
          locals: { getSession: vi.fn().mockResolvedValue(session), supabase: deleteSupabase },
          params: { gatheringId: 'gathering-1' }
        } as any),
      303,
      '/gatherings'
    );
  });

  it('validates comment creation edge cases', async () => {
    const { actions } = await import('./+page.server');

    await expect(
      actions.commentCreate({
        request: createFormRequest({ content: '짧음' }),
        locals: { getSession: vi.fn().mockResolvedValue(session), supabase: {} },
        params: { gatheringId: 'gathering-1' }
      } as any)
    ).resolves.toMatchObject({
      status: 400,
      data: {
        errors: { content: '댓글은 최소 5자 이상 입력해주세요.' }
      }
    });

    const missingPostSupabase = createSupabaseFromQueue([
      {
        table: 'gatherings',
        builder: createQueryBuilder({
          maybeSingle: { data: null, error: null }
        })
      }
    ]);

    await expect(
      actions.commentCreate({
        request: createFormRequest({ content: '충분히 긴 댓글입니다.' }),
        locals: { getSession: vi.fn().mockResolvedValue(session), supabase: missingPostSupabase },
        params: { gatheringId: 'gathering-1' }
      } as any)
    ).resolves.toMatchObject({
      status: 404,
      data: { serverMessage: '모임 게시글을 찾을 수 없습니다.' }
    });

    const wrongParentSupabase = createSupabaseFromQueue([
      {
        table: 'gatherings',
        builder: createQueryBuilder({
          maybeSingle: {
            data: { id: 'gathering-1', title: '모임', author_id: 'author-1' },
            error: null
          }
        })
      },
      {
        table: 'gathering_comments',
        builder: createQueryBuilder({
          maybeSingle: {
            data: { id: 'comment-1', author_id: 'author-2', gathering_id: 'other-gathering' },
            error: null
          }
        })
      }
    ]);

    await expect(
      actions.commentCreate({
        request: createFormRequest({
          content: '충분히 긴 댓글입니다.',
          parentCommentId: 'comment-1'
        }),
        locals: { getSession: vi.fn().mockResolvedValue(session), supabase: wrongParentSupabase },
        params: { gatheringId: 'gathering-1' }
      } as any)
    ).resolves.toMatchObject({
      status: 400,
      data: { serverMessage: '답글을 달 댓글을 찾을 수 없습니다.' }
    });

    const nestedParentSupabase = createSupabaseFromQueue([
      {
        table: 'gatherings',
        builder: createQueryBuilder({
          maybeSingle: {
            data: { id: 'gathering-1', title: '모임', author_id: 'author-1' },
            error: null
          }
        })
      },
      {
        table: 'gathering_comments',
        builder: createQueryBuilder({
          maybeSingle: {
            data: {
              id: 'comment-1',
              author_id: 'author-2',
              gathering_id: 'gathering-1',
              parent_comment_id: 'root-comment'
            },
            error: null
          }
        })
      }
    ]);

    await expect(
      actions.commentCreate({
        request: createFormRequest({
          content: '충분히 긴 댓글입니다.',
          parentCommentId: 'comment-1'
        }),
        locals: { getSession: vi.fn().mockResolvedValue(session), supabase: nestedParentSupabase },
        params: { gatheringId: 'gathering-1' }
      } as any)
    ).resolves.toMatchObject({
      status: 400,
      data: { serverMessage: '대댓글에는 다시 답글을 작성할 수 없습니다.' }
    });
  });

  it('creates comments and sends notifications to the post author and parent author', async () => {
    hasProfileEmailColumn.mockResolvedValue(true);
    const adminClient = createSupabaseFromQueue([
      {
        table: 'profiles',
        builder: createQueryBuilder({
          awaited: {
            data: [
              {
                user_id: 'author-1',
                full_name: '글쓴이',
                email: 'author@example.com',
                notify_comments: true
              },
              {
                user_id: 'author-2',
                full_name: '부모댓글작성자',
                email: 'parent@example.com',
                notify_comments: true
              }
            ],
            error: null
          }
        })
      }
    ]);
    getSupabaseAdminClient.mockReturnValue(adminClient);

    const supabase = createSupabaseFromQueue([
      {
        table: 'gatherings',
        builder: createQueryBuilder({
          maybeSingle: {
            data: { id: 'gathering-1', title: '모임', author_id: 'author-1' },
            error: null
          }
        })
      },
      {
        table: 'gathering_comments',
        builder: createQueryBuilder({
          maybeSingle: {
            data: {
              id: 'comment-1',
              author_id: 'author-2',
              gathering_id: 'gathering-1',
              parent_comment_id: null
            },
            error: null
          }
        })
      },
      {
        table: 'gathering_comments',
        builder: createQueryBuilder({
          awaited: { error: null }
        })
      },
      {
        table: 'profiles',
        builder: createQueryBuilder({
          maybeSingle: {
            data: { full_name: '댓글 작성자 실명' },
            error: null
          }
        })
      }
    ]);

    const { actions } = await import('./+page.server');

    await expect(
      actions.commentCreate({
        request: createFormRequest({
          content: '충분히 긴 댓글입니다.',
          parentCommentId: 'comment-1'
        }),
        locals: { getSession: vi.fn().mockResolvedValue(session), supabase },
        params: { gatheringId: 'gathering-1' }
      } as any)
    ).resolves.toEqual({
      intent: 'commentCreate',
      success: true,
      parentCommentId: 'comment-1'
    });

    expect(notifyGatheringCommentReceived).toHaveBeenCalledTimes(2);
    expect(notifyGatheringCommentReceived).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        kind: 'post',
        target: expect.objectContaining({ email: 'author@example.com' })
      })
    );
    expect(notifyGatheringCommentReceived).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        kind: 'reply',
        target: expect.objectContaining({ email: 'parent@example.com' })
      })
    );
  });

  it('validates comment update and delete flows', async () => {
    const { actions } = await import('./+page.server');

    await expect(
      actions.commentUpdate({
        request: createFormRequest({}),
        locals: { getSession: vi.fn().mockResolvedValue(session), supabase: {} }
      } as any)
    ).resolves.toMatchObject({
      status: 400,
      data: { serverMessage: '수정할 댓글을 찾을 수 없습니다.' }
    });

    const updateForbiddenSupabase = createSupabaseFromQueue([
      {
        table: 'gathering_comments',
        builder: createQueryBuilder({
          maybeSingle: { data: { id: 'comment-1', author_id: 'other-user' }, error: null }
        })
      }
    ]);

    await expect(
      actions.commentUpdate({
        request: createFormRequest({ commentId: 'comment-1', content: '충분한 댓글입니다.' }),
        locals: { getSession: vi.fn().mockResolvedValue(session), supabase: updateForbiddenSupabase }
      } as any)
    ).resolves.toMatchObject({
      status: 403,
      data: { serverMessage: '댓글을 수정할 권한이 없습니다.' }
    });

    const updateSuccessSupabase = createSupabaseFromQueue([
      {
        table: 'gathering_comments',
        builder: createQueryBuilder({
          maybeSingle: { data: { id: 'comment-1', author_id: 'user-1' }, error: null }
        })
      },
      {
        table: 'gathering_comments',
        builder: createQueryBuilder({
          awaited: { error: null }
        })
      }
    ]);

    await expect(
      actions.commentUpdate({
        request: createFormRequest({ commentId: 'comment-1', content: '충분한 댓글입니다.' }),
        locals: { getSession: vi.fn().mockResolvedValue(session), supabase: updateSuccessSupabase }
      } as any)
    ).resolves.toEqual({
      intent: 'commentUpdate',
      success: true,
      commentId: 'comment-1'
    });

    await expect(
      actions.commentDelete({
        request: createFormRequest({}),
        locals: { getSession: vi.fn().mockResolvedValue(session), supabase: {} }
      } as any)
    ).resolves.toMatchObject({
      status: 400,
      data: { serverMessage: '삭제할 댓글을 찾을 수 없습니다.' }
    });

    const deleteSuccessSupabase = createSupabaseFromQueue([
      {
        table: 'gathering_comments',
        builder: createQueryBuilder({
          maybeSingle: { data: { id: 'comment-1', author_id: 'user-1' }, error: null }
        })
      },
      {
        table: 'gathering_comments',
        builder: createQueryBuilder({
          awaited: { error: null }
        })
      }
    ]);

    await expect(
      actions.commentDelete({
        request: createFormRequest({ commentId: 'comment-1' }),
        locals: { getSession: vi.fn().mockResolvedValue(session), supabase: deleteSuccessSupabase }
      } as any)
    ).resolves.toEqual({
      intent: 'commentDelete',
      success: true
    });
  });
});
