import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import type { PodChangeRole } from '@duncit/utils';
import ChangeRequestTable from '../ChangeRequestTable';

const seen = vi.hoisted(() => ({
  table: null as Record<string, unknown> | null,
  fetch: null as unknown[] | null,
  columnArgs: null as Record<string, unknown> | null,
}));

vi.mock('@duncit/table', () => ({
  DuncitTable: (props: Record<string, unknown>) => {
    seen.table = props;
    return <div data-testid="grid" />;
  },
  useApolloTableFetch: (...args: unknown[]) => {
    seen.fetch = args;
    return 'fetch-rows';
  },
}));
vi.mock('../columns', () => ({
  buildChangeRequestColumns: (args: Record<string, unknown>) => {
    seen.columnArgs = args;
    return [{ field: 'stub' }];
  },
}));

const mount = (role: PodChangeRole) => {
  const onAssign = vi.fn();
  const onCancelPod = vi.fn();
  const refetchRef = { current: null };
  render(
    <MockedProvider>
      <ChangeRequestTable
        role={role}
        onAssign={onAssign}
        onCancelPod={onCancelPod}
        refetchRef={refetchRef}
      />
    </MockedProvider>,
  );
  return { onAssign, onCancelPod, refetchRef };
};

describe('ChangeRequestTable', () => {
  beforeEach(() => {
    seen.table = null;
    seen.fetch = null;
    seen.columnArgs = null;
  });

  it.each([
    ['VENUE', 'admin-change-requests-venue'],
    ['HOST', 'admin-change-requests-host'],
    ['CLUB_ADMIN', 'admin-change-requests-club-admin'],
  ] as const)('keeps a separate saved layout for the %s queue', (role, tableId) => {
    mount(role);
    expect(seen.table?.tableId).toBe(tableId);
  });

  it('reads the role\'s own queue off the changeRequests table, re-keyed by role', () => {
    mount('HOST');
    const [, , resultKey, options, deps] = seen.fetch as [unknown, unknown, string, unknown, unknown];
    expect(resultKey).toBe('podChangeRequests');
    expect(options).toEqual({ extraVariables: { role: 'HOST' } });
    expect(deps).toEqual(['HOST']);
    expect(seen.table?.fetchRows).toBe('fetch-rows');
  });

  it('builds its columns for the role with the page\'s action handlers', () => {
    const { onAssign, onCancelPod } = mount('CLUB_ADMIN');
    expect(seen.columnArgs).toMatchObject({ role: 'CLUB_ADMIN', onAssign, onCancelPod });
    expect(seen.table?.columns).toEqual([{ field: 'stub' }]);
  });

  it('hands the page the grid\'s reload handle, sorted newest first', () => {
    const { refetchRef } = mount('VENUE');
    expect(seen.table?.refetchRef).toBe(refetchRef);
    expect(seen.table?.defaultSort).toEqual({ field: 'created_at', dir: 'desc' });
    const getRowId = seen.table?.getRowId as (row: { id: string }) => string;
    expect(getRowId({ id: 'req-5' })).toBe('req-5');
  });
});
