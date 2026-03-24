import { describe, expect, it } from 'vitest';
import { getProfileFallbacks } from './profileDefaults';

const createSession = (overrides?: {
  email?: string | null;
  full_name?: unknown;
  title?: unknown;
}) =>
  ({
    user: {
      id: 'user-1',
      email: overrides?.email ?? 'member@example.com',
      user_metadata: {
        full_name: overrides?.full_name,
        title: overrides?.title
      }
    }
  }) as any;

describe('getProfileFallbacks', () => {
  it('uses trimmed profile metadata when available', () => {
    expect(
      getProfileFallbacks(
        createSession({
          full_name: '  김개발  ',
          title: '  Backend Engineer  '
        })
      )
    ).toEqual({
      full_name: '김개발',
      role: 'Backend Engineer'
    });
  });

  it('falls back to email and default role when metadata is missing', () => {
    expect(
      getProfileFallbacks(
        createSession({
          email: 'fallback@example.com',
          full_name: '',
          title: undefined
        })
      )
    ).toEqual({
      full_name: 'fallback@example.com',
      role: '직무 미정'
    });
  });
});
