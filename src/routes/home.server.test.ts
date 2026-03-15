import { describe, expect, it, vi } from 'vitest';
import { createQueryBuilder, createSupabaseByTable, createSupabaseFromQueue } from '../test/support/supabase';
import { createFormRequest, expectRedirect } from '../test/support/sveltekit';

describe('/ home server', () => {
  it('returns no invitee prompt for guests', async () => {
    const { load } = await import('./+page.server');

    await expect(load({ locals: { getSession: vi.fn().mockResolvedValue(null) } } as any)).resolves
      .toEqual({
        inviteePrompt: null,
        homeData: null
      });
  });

  it('returns a prompt for newly redeemed invitees', async () => {
    const { load } = await import('./+page.server');
    const session = { user: { id: 'inviter-1', user_metadata: {} } } as any;
    const supabase = createSupabaseByTable({
      invite_redemptions: [
        createQueryBuilder({
          maybeSingle: {
            data: {
              id: 'redemption-1',
              invitee_user_id: 'invitee-1',
              invite: { inviter_user_id: 'inviter-1' },
              invitee: { full_name: '신규 멤버', role: 'Frontend Engineer' }
            },
            error: null
          }
        })
      ],
      profiles: [
        createQueryBuilder({
          maybeSingle: { data: null, error: null }
        }),
        createQueryBuilder({
          awaited: { data: [], error: null }
        })
      ],
      gatherings: [
        createQueryBuilder({
          awaited: { data: [], error: null }
        })
      ],
      endorsements: [
        createQueryBuilder({
          awaited: { data: [], error: null, count: 0 }
        })
      ]
    });

    await expect(
      load({
        locals: { getSession: vi.fn().mockResolvedValue(session), supabase }
      } as any)
    ).resolves.toEqual({
      inviteePrompt: {
        redemptionId: 'redemption-1',
        inviteeUserId: 'invitee-1',
        inviteeName: '신규 멤버',
        inviteeRole: 'Frontend Engineer'
      },
      homeData: {
        profile: {
          full_name: '멤버',
          role: '프로필을 보완해보세요',
          photo_url: null,
          updated_at: null
        },
        summary: {
          profileCompletion: 0,
          endorsementCount: 0,
          recentGatheringCount: 0
        },
        nextAction: {
          title: '프로필을 더 완성해보세요',
          description: '소개와 커리어를 채우면 더 빠르게 신뢰를 만들 수 있습니다.',
          href: '/profile',
          ctaLabel: '프로필 보완하기'
        },
        recentMembers: [],
        recentGatherings: [],
        homeError: null
      }
    });
  });

  it('acknowledges invite prompts and redirects to the next page when requested', async () => {
    const { actions } = await import('./+page.server');
    const session = { user: { id: 'inviter-1' } } as any;
    const updateBuilder = createQueryBuilder({
      awaited: { error: null }
    });
    const supabase = createSupabaseFromQueue([
      {
        table: 'invite_redemptions',
        builder: createQueryBuilder({
          maybeSingle: {
            data: {
              id: 'redemption-1',
              invite: { inviter_user_id: 'inviter-1' }
            },
            error: null
          }
        })
      },
      {
        table: 'invite_redemptions',
        builder: updateBuilder
      }
    ]);

    await expectRedirect(
      () =>
        actions.acknowledgeInviteePrompt({
          request: createFormRequest({
            redemptionId: 'redemption-1',
            intent: 'visit',
            next: '/members/invitee-1'
          }),
          locals: { getSession: vi.fn().mockResolvedValue(session), supabase }
        } as any),
      303,
      '/members/invitee-1'
    );

    expect(updateBuilder.update).toHaveBeenCalledWith({
      inviter_notified_at: expect.any(String)
    });
  });
});
