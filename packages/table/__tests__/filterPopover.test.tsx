import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Force the open-effect to seed an EMPTY draft map so the first control edit lands
// on an unseeded field, exercising updateDraft's `?? emptyDraft()` base fallback.
// Only filtersToDraft is stubbed; the rest of filterState stays real.
vi.mock('../src/toolbar/filterState', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/toolbar/filterState')>();
  return { ...actual, filtersToDraft: () => ({}) };
});

// eslint-disable-next-line import/first -- must import after the filterState mock is registered
import { FilterPopover } from '../src/toolbar/FilterPopover';
import type { DuncitColumn, TableFilterValue } from '../src/types';

type Row = Record<string, unknown>;

const columns: DuncitColumn<Row>[] = [
  { field: 'name', headerName: 'Name', filter: { type: 'text' } },
];

describe('FilterPopover updateDraft fallback', () => {
  it('builds a fresh draft when the edited field has no seeded entry, then applies it', () => {
    const setFilters = vi.fn();
    const onClose = vi.fn();
    render(
      <FilterPopover<Row>
        open
        anchorEl={document.body}
        onClose={onClose}
        columns={columns}
        filters={[] as TableFilterValue[]}
        setFilters={setFilters}
      />,
    );
    // drafts seeded as {} (mock) -> this edit hits the `prev[field] ?? emptyDraft()` path.
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'zeta' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(setFilters).toHaveBeenCalledWith([{ field: 'name', op: 'contains', value: 'zeta' }]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
