import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import type { ErrorLogRow } from '../../src/pages/error-logs-page/queries';

const captured = vi.hoisted(() => ({
  columns: [] as Array<{ field: string; valueGetter?: (row: ErrorLogRow) => unknown }>,
}));

vi.mock('@duncit/table', () => ({
  DuncitTable: (p: { columns: typeof captured.columns }) => {
    captured.columns = p.columns;
    return null;
  },
}));

import ErrorBoundariesTable from '../../src/pages/error-boundaries-page/ErrorBoundariesTable';

const col = (field: string) => captured.columns.find((c) => c.field === field);

describe('ErrorBoundariesTable app version column', () => {
  const mount = () =>
    render(
      <ErrorBoundariesTable
        fetchRows={vi.fn()}
        refetchRef={{ current: null }}
        onOpen={vi.fn()}
        selection={{ onChange: vi.fn(), clearRef: { current: null } }}
        onQueryChange={vi.fn()}
      />,
    );

  it('shows the client build the crash happened on', () => {
    mount();
    const row = { client: { app_version: '4.2.0' } } as unknown as ErrorLogRow;
    expect(col('app_version')?.valueGetter?.(row)).toBe('4.2.0');
  });

  it('shows a dash when the report carried no client info', () => {
    mount();
    expect(col('app_version')?.valueGetter?.({ client: null } as unknown as ErrorLogRow)).toBe('—');
  });
});
