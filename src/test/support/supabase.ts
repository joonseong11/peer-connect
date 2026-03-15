import { vi } from 'vitest';

type QueryResult = { data?: unknown; error?: unknown; count?: number | null };

type QueryBuilderOptions = {
  awaited?: QueryResult;
  maybeSingle?: QueryResult;
  single?: QueryResult;
};

export const createQueryBuilder = (options: QueryBuilderOptions = {}) => {
  const awaited = options.awaited ?? { data: null, error: null };
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => options.maybeSingle ?? awaited),
    single: vi.fn(async () => options.single ?? awaited),
    not: vi.fn(() => builder),
    is: vi.fn(() => builder),
    in: vi.fn(() => builder),
    or: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    then: (resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(awaited).then(resolve, reject)
  };

  return builder;
};

export const createSupabaseFromQueue = (
  entries: Array<{ table: string; builder: ReturnType<typeof createQueryBuilder> }>
) => {
  const queue = [...entries];

  return {
    from: vi.fn((table: string) => {
      const next = queue.shift();

      if (!next) {
        throw new Error(`Unexpected Supabase table access: ${table}`);
      }

      if (next.table !== table) {
        throw new Error(`Expected Supabase table ${next.table} but received ${table}`);
      }

      return next.builder;
    })
  };
};
