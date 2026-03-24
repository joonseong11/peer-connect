import { expect, vi } from 'vitest';

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

export const expectHttpError = async (
  callback: () => unknown,
  status: number,
  message?: string
) => {
  try {
    await Promise.resolve(callback());
  } catch (error) {
    expect(error).toMatchObject({
      status
    });

    if (message) {
      expect(error).toMatchObject({
        body: expect.objectContaining({
          message
        })
      });
    }

    return;
  }

  throw new Error(`Expected http error ${status}`);
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

export const createCookies = (initial: Record<string, string> = {}) => {
  const store = new Map(Object.entries(initial));

  return {
    get: vi.fn((name: string) => store.get(name)),
    set: vi.fn((name: string, value: string) => {
      store.set(name, value);
    }),
    delete: vi.fn((name: string) => {
      store.delete(name);
    })
  };
};
