import { describe, expect, it } from 'vitest';
import { normalizeEmail } from './normalizeEmail';

describe('normalizeEmail', () => {
  it('returns null for non-string values', () => {
    expect(normalizeEmail(undefined)).toBeNull();
    expect(normalizeEmail(null)).toBeNull();
  });

  it('trims whitespace and lowercases emails', () => {
    expect(normalizeEmail('  USER@Example.COM  ')).toBe('user@example.com');
  });

  it('returns null for empty strings after trimming', () => {
    expect(normalizeEmail('   ')).toBeNull();
  });
});
