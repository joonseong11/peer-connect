import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createSupabaseServerClient } = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn()
}));

vi.mock('$lib/server/supabase', () => ({
  createSupabaseServerClient
}));

describe('handle', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('attaches the Supabase client and enriches the session user', async () => {
    const session = {
      user: { id: 'session-user' }
    };
    const verifiedUser = { id: 'verified-user', email: 'member@example.com' };
    const supabase = {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session } }),
        getUser: vi.fn().mockResolvedValue({
          data: { user: verifiedUser },
          error: null
        })
      }
    };
    createSupabaseServerClient.mockReturnValue(supabase);

    const { handle } = await import('./hooks.server');
    const event = { locals: {} } as any;
    const resolve = vi.fn(async (_event, options) => {
      expect(options.filterSerializedResponseHeaders('content-range')).toBe(true);
      expect(options.filterSerializedResponseHeaders('x-test')).toBe(false);

      const resolvedSession = await _event.locals.getSession();
      expect(resolvedSession?.user).toEqual(verifiedUser);
      return new Response('ok');
    });

    const response = await handle({ event, resolve } as any);

    expect(createSupabaseServerClient).toHaveBeenCalledWith(event);
    expect(event.locals.supabase).toBe(supabase);
    expect(response).toBeInstanceOf(Response);
  });

  it('keeps the original session user when verification fails', async () => {
    const session = {
      user: { id: 'session-user' }
    };
    const supabase = {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session } }),
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'boom' }
        })
      }
    };
    createSupabaseServerClient.mockReturnValue(supabase);

    const { handle } = await import('./hooks.server');
    const event = { locals: {} } as any;

    await handle({
      event,
      resolve: vi.fn(async (_event) => {
        const resolvedSession = await _event.locals.getSession();
        expect(resolvedSession?.user).toEqual(session.user);
        return new Response('ok');
      })
    } as any);
  });
});
