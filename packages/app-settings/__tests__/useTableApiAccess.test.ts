import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useQueryMock } = vi.hoisted(() => ({ useQueryMock: vi.fn() }));

vi.mock('@apollo/client', () => ({
  gql: (strings: TemplateStringsArray) => strings,
}));
vi.mock('@apollo/client/react', () => ({
  useQuery: useQueryMock,
}));

const { MY_TABLE_API_ACCESS, useTableApiAccess } = await import('../src/useTableApiAccess');

beforeEach(() => {
  useQueryMock.mockReset();
});

describe('useTableApiAccess', () => {
  it('does not ask the server until the dialog is opened', () => {
    useQueryMock.mockReturnValue({ data: undefined, loading: false, error: undefined });
    expect(useTableApiAccess(false)).toEqual({ loading: false, token: null, baseUrl: '', error: false });
    expect(useQueryMock).toHaveBeenCalledWith(MY_TABLE_API_ACCESS, {
      skip: true,
      fetchPolicy: 'cache-and-network',
    });
  });

  it('hands back the token and base URL once they arrive', () => {
    useQueryMock.mockReturnValue({
      data: { myTableApiAccess: { token: 'dtt_4821', base_url: 'https://server.duncit.com/table-api' } },
      loading: false,
      error: undefined,
    });
    expect(useTableApiAccess(true)).toEqual({
      loading: false,
      token: 'dtt_4821',
      baseUrl: 'https://server.duncit.com/table-api',
      error: false,
    });
  });

  it('reports a failed read', () => {
    useQueryMock.mockReturnValue({ data: undefined, loading: false, error: new Error('offline') });
    expect(useTableApiAccess(true).error).toBe(true);
  });
});
