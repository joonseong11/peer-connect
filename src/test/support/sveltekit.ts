import { expect } from 'vitest';

export const expectRedirect = async (
  callback: () => unknown,
  status: number,
  location: string
) => {
  try {
    await Promise.resolve(callback());
  } catch (error) {
    expect(error).toMatchObject({ status, location });
    return;
  }

  throw new Error(`Expected redirect to ${location}`);
};

export const createFormRequest = (fields: Record<string, string>) => {
  const formData = new FormData();

  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }

  return new Request('http://localhost/test', {
    method: 'POST',
    body: formData
  });
};
