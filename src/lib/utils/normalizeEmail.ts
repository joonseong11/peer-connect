export const normalizeEmail = (email: string | null | undefined): string | null => {
  if (typeof email !== 'string') {
    return null;
  }

  const trimmed = email.trim();

  if (trimmed.length === 0) {
    return null;
  }

  return trimmed.toLowerCase();
};
