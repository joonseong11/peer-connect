import { describe, expect, it, vi } from 'vitest';
import { createQueryBuilder, createSupabaseFromQueue } from '../../../test/support/supabase';
import { createFormRequest, expectRedirect } from '../../../test/support/sveltekit';

const createStorage = ({
  uploadError = null,
  publicUrl = 'https://cdn.peer.test/avatar.png'
}: {
  uploadError?: unknown;
  publicUrl?: string;
}) => ({
  from: vi.fn(() => ({
    upload: vi.fn(async () => ({ error: uploadError })),
    getPublicUrl: vi.fn(() => ({ data: { publicUrl } }))
  }))
});

describe('/mypage/avatar', () => {
  it('redirects unauthenticated users on load', async () => {
    const { load } = await import('./+page.server');

    await expectRedirect(
      () =>
        load({
          locals: { getSession: vi.fn().mockResolvedValue(null) }
        } as any),
      303,
      '/?authError=signin-required'
    );
  });

  it('returns a load error when loading the profile photo fails', async () => {
    const { load } = await import('./+page.server');
    const session = { user: { id: 'user-1' } } as any;
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
        locals: { getSession: vi.fn().mockResolvedValue(session), supabase }
      } as any)
    ).resolves.toEqual({
      session,
      profile: null,
      loadError: '프로필 정보를 불러오지 못했습니다.'
    });
  });

  it('validates avatar presence, size, and mime type', async () => {
    const { actions } = await import('./+page.server');
    const session = { user: { id: 'user-1' } } as any;
    const baseLocals = {
      getSession: vi.fn().mockResolvedValue(session),
      supabase: {}
    };

    await expect(
      actions.default({
        request: createFormRequest({}),
        locals: baseLocals
      } as any)
    ).resolves.toMatchObject({
      status: 400,
      data: { error: '이미지를 선택해주세요.' }
    });

    const bigForm = new FormData();
    bigForm.set(
      'avatar',
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' })
    );
    await expect(
      actions.default({
        request: new Request('http://localhost/avatar', { method: 'POST', body: bigForm }),
        locals: baseLocals
      } as any)
    ).resolves.toMatchObject({
      status: 400,
      data: { error: '이미지 용량은 5MB 이하만 업로드할 수 있습니다.' }
    });

    const textForm = new FormData();
    textForm.set('avatar', new File(['hello'], 'avatar.txt', { type: 'text/plain' }));
    await expect(
      actions.default({
        request: new Request('http://localhost/avatar', { method: 'POST', body: textForm }),
        locals: baseLocals
      } as any)
    ).resolves.toMatchObject({
      status: 400,
      data: { error: '이미지 파일만 업로드할 수 있습니다.' }
    });
  });

  it('returns errors for upload and profile update failures, and returns the public url on success', async () => {
    const { actions } = await import('./+page.server');
    const session = { user: { id: 'user-1' } } as any;
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('33333333-3333-3333-3333-333333333333');

    const uploadFailSupabase = {
      storage: createStorage({ uploadError: { message: 'upload failed' } }),
      from: vi.fn()
    };
    const uploadForm = new FormData();
    uploadForm.set('avatar', new File(['image'], 'avatar.png', { type: 'image/png' }));

    await expect(
      actions.default({
        request: new Request('http://localhost/avatar', { method: 'POST', body: uploadForm }),
        locals: {
          getSession: vi.fn().mockResolvedValue(session),
          supabase: uploadFailSupabase
        }
      } as any)
    ).resolves.toMatchObject({
      status: 500,
      data: { error: '프로필 이미지를 업로드하지 못했습니다. 잠시 후 다시 시도해주세요.' }
    });

    const updateBuilder = createQueryBuilder({
      awaited: { error: { message: 'update failed' } }
    });
    const updateFailSupabase = {
      storage: createStorage({}),
      ...createSupabaseFromQueue([
        {
          table: 'profiles',
          builder: updateBuilder
        }
      ])
    };

    await expect(
      actions.default({
        request: new Request('http://localhost/avatar', { method: 'POST', body: uploadForm }),
        locals: {
          getSession: vi.fn().mockResolvedValue(session),
          supabase: updateFailSupabase
        }
      } as any)
    ).resolves.toMatchObject({
      status: 500,
      data: { error: '프로필 정보를 업데이트하지 못했습니다.' }
    });

    const successBuilder = createQueryBuilder({
      awaited: { error: null }
    });
    const successSupabase = {
      storage: createStorage({ publicUrl: 'https://cdn.peer.test/avatar.png' }),
      ...createSupabaseFromQueue([
        {
          table: 'profiles',
          builder: successBuilder
        }
      ])
    };

    await expect(
      actions.default({
        request: new Request('http://localhost/avatar', { method: 'POST', body: uploadForm }),
        locals: {
          getSession: vi.fn().mockResolvedValue(session),
          supabase: successSupabase
        }
      } as any)
    ).resolves.toEqual({
      success: true,
      photo_url: 'https://cdn.peer.test/avatar.png'
    });
  });
});
