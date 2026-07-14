import { createTheme } from '@mui/material/styles';
import { describe, expect, it, vi } from 'vitest';
import { tableQueryToGql } from '../src/gql';
import type { TableQueryState } from '../src/types';

// Capture the exact params our mapping feeds into the AG Grid Theming API.
vi.mock('ag-grid-community', () => ({
  themeQuartz: { withParams: (params: Record<string, unknown>) => ({ params }) },
}));

describe('tableQueryToGql', () => {
  it('maps the full query state to the exact TableQueryInput variables object', () => {
    const q: TableQueryState = {
      search: 'ali',
      page: 2,
      pageSize: 50,
      sortBy: 'name',
      sortDir: 'desc',
      filters: [
        { field: 'status', op: 'in', values: ['A'] },
        { field: 'name', op: 'contains', value: 'x' },
      ],
    };
    expect(tableQueryToGql(q)).toEqual({
      query: {
        search: 'ali',
        page: 2,
        page_size: 50,
        sort_by: 'name',
        sort_dir: 'desc',
        filters: [
          { field: 'status', op: 'in', value: null, values: ['A'] },
          { field: 'name', op: 'contains', value: 'x', values: null },
        ],
      },
    });
  });

  it('empty search becomes null', () => {
    const q: TableQueryState = {
      search: '',
      page: 1,
      pageSize: 25,
      sortBy: null,
      sortDir: 'asc',
      filters: [],
    };
    expect(tableQueryToGql(q).query).toMatchObject({ search: null, sort_by: null, filters: [] });
  });
});

describe('buildAgTheme', () => {
  it('derives AG theme params from the live MUI theme', async () => {
    const { buildAgTheme } = await import('../src/theme');
    const dark = createTheme({ palette: { mode: 'dark' } });
    const result = buildAgTheme(dark) as unknown as { params: Record<string, unknown> };
    expect(result.params).toMatchObject({
      accentColor: dark.palette.primary.main,
      backgroundColor: dark.palette.background.paper,
      borderColor: dark.palette.divider,
      browserColorScheme: 'dark',
      fontFamily: dark.typography.fontFamily,
      fontSize: dark.typography.fontSize,
      foregroundColor: dark.palette.text.primary,
      rowHoverColor: dark.palette.action.hover,
      wrapperBorderRadius: dark.shape.borderRadius,
    });
  });
});
