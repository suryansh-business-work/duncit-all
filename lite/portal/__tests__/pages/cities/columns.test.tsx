import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DuncitColumn } from '@duncit/table';
import type { LiteAdminCity } from '../../../graphql/catalogue';
import { buildCityColumns, cityRowId, citySearchText } from '../../../pages/cities/columns';
import { makeCity } from '../../fixtures';
import { portalT } from '../../test-utils';

const build = () => {
  const handlers = { onEdit: vi.fn(), onDelete: vi.fn() };
  return { handlers, columns: buildCityColumns(portalT, handlers) };
};

const column = (columns: DuncitColumn<LiteAdminCity>[], field: string): DuncitColumn<LiteAdminCity> => {
  const found = columns.find((c) => c.field === field);
  if (!found) throw new Error(`no column ${field}`);
  return found;
};

describe('city columns', () => {
  it('reads id and search text off the row', () => {
    const city = makeCity();
    expect(cityRowId(city)).toBe('city-1');
    expect(citySearchText(city)).toBe('Bengaluru bengaluru India');
  });

  it('heads every column in English, in display order', () => {
    const { columns } = build();
    expect(columns.map((c) => c.headerName)).toEqual(['Name', 'Slug', 'Country', 'Featured', 'Sort order', 'Status', 'Events', 'Actions']);
    expect(columns.map((c) => c.type)).toEqual(['text', 'text', 'text', 'boolean', 'number', 'boolean', 'number', 'actions']);
  });

  it('exports Featured / Not featured and draws the matching chip', () => {
    const featured = column(build().columns, 'featured');
    expect(featured.valueGetter?.(makeCity({ featured: true }))).toBe('Featured');
    expect(featured.valueGetter?.(makeCity({ featured: false }))).toBe('Not featured');
    render(<>{featured.cellRenderer?.(makeCity({ featured: false }))}</>);
    expect(screen.getByText('Not featured')).toBeInTheDocument();
  });

  it('labels the status chip Active / Inactive', () => {
    const status = column(build().columns, 'is_active');
    expect(status.valueGetter?.(makeCity({ is_active: true }))).toBe('Active');
    expect(status.valueGetter?.(makeCity({ is_active: false }))).toBe('Inactive');
  });

  it('names the row actions after the city and hands the row to them', async () => {
    const user = userEvent.setup();
    const { columns, handlers } = build();
    const city = makeCity();
    render(<>{column(columns, 'actions').cellRenderer?.(city)}</>);
    await user.click(screen.getByRole('button', { name: 'Edit Bengaluru' }));
    await user.click(screen.getByRole('button', { name: 'Delete Bengaluru' }));
    expect(handlers.onEdit).toHaveBeenCalledWith(city);
    expect(handlers.onDelete).toHaveBeenCalledWith(city);
  });
});
