import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryBuilder, createSupabaseFromQueue } from '../../../../test/support/supabase';

const { notifyGatheringDigest, hasProfileEmailColumn, getSupabaseAdminClient } = vi.hoisted(() => ({
  notifyGatheringDigest: vi.fn(),
  hasProfileEmailColumn: vi.fn(),
  getSupabaseAdminClient: vi.fn()
}));

vi.mock('$lib/server/notifications', () => ({
  notifyGatheringDigest
}));

vi.mock('$lib/server/profileEmailColumn', () => ({
  hasProfileEmailColumn
}));

vi.mock('$lib/server/supabaseAdmin', () => ({
  getSupabaseAdminClient
}));

describe('/api/cron/gathering-digest', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('returns 500 when the admin client is unavailable', async () => {
    getSupabaseAdminClient.mockReturnValue(null);

    const { POST } = await import('./+server');
    const response = await POST({ locals: {} } as any);

    await expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'Admin client not configured'
    });
  });

  it('returns early when there are no pending posts', async () => {
    hasProfileEmailColumn.mockResolvedValue(true);

    const adminClient = createSupabaseFromQueue([
      {
        table: 'gatherings',
        builder: createQueryBuilder({
          awaited: { data: [], error: null }
        })
      }
    ]);

    getSupabaseAdminClient.mockReturnValue(adminClient);

    const { GET } = await import('./+server');
    const response = await GET({ locals: {} } as any);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: 'No pending posts',
      sent: 0
    });
  });

  it('marks posts as sent when there are no recipients to notify', async () => {
    hasProfileEmailColumn.mockResolvedValue(true);

    const updateBuilder = createQueryBuilder({
      awaited: { error: null }
    });
    const adminClient = createSupabaseFromQueue([
      {
        table: 'gatherings',
        builder: createQueryBuilder({
          awaited: {
            data: [
              {
                id: 'post-1',
                title: '새 모임',
                content: '본문',
                created_at: '2026-03-15T10:00:00.000Z',
                author_id: 'author-1',
                author: { full_name: '작성자' }
              }
            ],
            error: null
          }
        })
      },
      {
        table: 'profiles',
        builder: createQueryBuilder({
          awaited: {
            data: [
              {
                user_id: 'author-1',
                email: 'author@example.com',
                full_name: '작성자',
                notify_gatherings: true
              }
            ],
            error: null
          }
        })
      },
      {
        table: 'gatherings',
        builder: updateBuilder
      }
    ]);

    getSupabaseAdminClient.mockReturnValue(adminClient);

    const { POST } = await import('./+server');
    const response = await POST({ locals: {} } as any);

    expect(updateBuilder.update).toHaveBeenCalledWith({ email_sent: true });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: 'No recipients to notify',
      posts: 1,
      sent: 0
    });
  });

  it('returns 500 when sending the digest email fails', async () => {
    hasProfileEmailColumn.mockResolvedValue(true);
    notifyGatheringDigest.mockResolvedValue({ ok: false });

    const adminClient = createSupabaseFromQueue([
      {
        table: 'gatherings',
        builder: createQueryBuilder({
          awaited: {
            data: [
              {
                id: 'post-1',
                title: '새 모임',
                content: '본문',
                created_at: '2026-03-15T10:00:00.000Z',
                author_id: 'author-1',
                author: { full_name: '작성자' }
              }
            ],
            error: null
          }
        })
      },
      {
        table: 'profiles',
        builder: createQueryBuilder({
          awaited: {
            data: [
              {
                user_id: 'member-1',
                email: 'member@example.com',
                full_name: '멤버',
                notify_gatherings: true
              }
            ],
            error: null
          }
        })
      }
    ]);

    getSupabaseAdminClient.mockReturnValue(adminClient);

    const { POST } = await import('./+server');
    const response = await POST({ locals: {} } as any);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'Failed to send digest email'
    });
  });

  it('sends the digest and marks pending posts as sent on success', async () => {
    hasProfileEmailColumn.mockResolvedValue(true);
    notifyGatheringDigest.mockResolvedValue({ ok: true });

    const updateBuilder = createQueryBuilder({
      awaited: { error: null }
    });
    const adminClient = createSupabaseFromQueue([
      {
        table: 'gatherings',
        builder: createQueryBuilder({
          awaited: {
            data: [
              {
                id: 'post-1',
                title: '새 모임',
                content: '본문',
                created_at: '2026-03-15T10:00:00.000Z',
                author_id: 'author-1',
                author: { full_name: '작성자' }
              }
            ],
            error: null
          }
        })
      },
      {
        table: 'profiles',
        builder: createQueryBuilder({
          awaited: {
            data: [
              {
                user_id: 'member-1',
                email: 'member@example.com',
                full_name: '멤버',
                notify_gatherings: true
              },
              {
                user_id: 'author-1',
                email: 'author@example.com',
                full_name: '작성자',
                notify_gatherings: true
              }
            ],
            error: null
          }
        })
      },
      {
        table: 'gatherings',
        builder: updateBuilder
      }
    ]);

    getSupabaseAdminClient.mockReturnValue(adminClient);

    const { GET } = await import('./+server');
    const response = await GET({ locals: {} } as any);

    expect(notifyGatheringDigest).toHaveBeenCalledWith({
      recipients: [{ email: 'member@example.com', name: '멤버' }],
      posts: [
        {
          id: 'post-1',
          title: '새 모임',
          content: '본문',
          created_at: '2026-03-15T10:00:00.000Z',
          authorName: '작성자'
        }
      ]
    });
    expect(updateBuilder.update).toHaveBeenCalledWith({ email_sent: true });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: 'Digest sent successfully',
      posts: 1,
      recipients: 1
    });
  });
});
