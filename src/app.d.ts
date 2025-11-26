import type { Session, SupabaseClient } from '@supabase/supabase-js';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      supabase: SupabaseClient;
      getSession: () => Promise<Session | null>;
    }
    interface PageData {
      session: Session | null;
      invite?: {
        redemption_id: string;
        invite_id: string;
        inviter_user_id: string | null;
      } | null;
      authErrorMessage?: string | null;
      authRedirectTarget?: string | null;
      invitesEnabled?: boolean;
      inviteePrompt?: {
        redemptionId: string;
        inviteeUserId: string;
        inviteeName: string | null;
        inviteeRole: string | null;
      } | null;
    }
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
