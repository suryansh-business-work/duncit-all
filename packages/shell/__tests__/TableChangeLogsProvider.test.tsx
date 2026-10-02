import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TableChangeLogApi, TableQueryState } from '@duncit/table';

const { client } = vi.hoisted(() => ({ client: { query: vi.fn() } }));

vi.mock('@apollo/client/react', () => ({ useApolloClient: () => client }));

const { useTableChangeLogApi } = await import('@duncit/table');
const { TableChangeLogsProvider, TABLE_CHANGE_LOGS } = await import('../src/change-logs/TableChangeLogsProvider');

const seen: { api: TableChangeLogApi | null } = { api: null };

function Probe() {
  seen.api = useTableChangeLogApi();
  return null;
}

const QUERY: TableQueryState = { search: 'amount', page: 2, pageSize: 25, sortBy: null, sortDir: 'desc', filters: [] };

function mount(enabled: boolean, detailed = false) {
  render(
    <TableChangeLogsProvider enabled={enabled} detailed={detailed}>
      <Probe />
    </TableChangeLogsProvider>
  );
}

beforeEach(() => {
  seen.api = null;
  client.query.mockReset();
});

describe('TableChangeLogsProvider', () => {
  it('gives grids no change log until someone is signed in', () => {
    mount(false);
    expect(seen.api).toBeNull();
  });

  it("asks the server for a table's change log as the view's variables, and says how much to show", async () => {
    const page = { rows: [], total: 0 };
    client.query.mockResolvedValue({ data: { tableChangeLogs: page } });
    mount(true, true);

    expect(seen.api?.detailed).toBe(true);
    await expect(seen.api?.fetch('payoutsTable', { status: 'PAID' }, QUERY)).resolves.toBe(page);
    expect(client.query).toHaveBeenCalledWith({
      query: TABLE_CHANGE_LOGS,
      variables: {
        table: 'payoutsTable',
        variables: '{"status":"PAID"}',
        query: expect.objectContaining({ search: 'amount', page: 2, page_size: 25 }),
      },
      fetchPolicy: 'network-only',
    });
  });

  it('fails readably when the server answers with no data', async () => {
    client.query.mockResolvedValue({ data: undefined });
    mount(true);
    await expect(seen.api?.fetch('payoutsTable', {}, QUERY)).rejects.toThrow('The change log could not be loaded.');
  });
});
