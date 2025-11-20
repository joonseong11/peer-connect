import type { Session } from '@supabase/supabase-js';

export const getProfileFallbacks = (session: Session) => {
        const fallbackName =
                typeof session.user.user_metadata?.full_name === 'string' &&
                session.user.user_metadata.full_name.trim().length > 0
                        ? session.user.user_metadata.full_name.trim()
                        : session.user.email ?? '새 멤버';

        const fallbackRole =
                typeof session.user.user_metadata?.title === 'string' &&
                session.user.user_metadata.title.trim().length > 0
                        ? session.user.user_metadata.title.trim()
                        : '직무 미정';

        return { full_name: fallbackName, role: fallbackRole };
};
