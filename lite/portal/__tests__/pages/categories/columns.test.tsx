import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EM_DASH, type DuncitColumn } from '@duncit/table';
import type { LiteAdminCategory } from '../../../graphql/catalogue';
import { buildCategoryColumns, categoryRowId, categorySearchText } from '../../../pages/categories/columns';
import { makeCategory } from '../../fixtures';
import { portalT } from '../../test-utils';

const column = (columns: DuncitColumn<LiteAdminCategory>[], field: string): DuncitColumn<LiteAdminCategory> => {
  const found = columns.find((c) => c.field === field);
  if (!found) throw new Error(`no column ${field}`);
  return found;
};

describe('category columns', () => {
  it('reads id and search text off the row', () => {
    expect(categoryRowId(makeCategory())).toBe('cat-1');
    expect(categorySearchText(makeCategory())).toBe('Music music');
  });

  it('heads the columns in English', () => {
    const columns = buildCategoryColumns(portalT, { onEdit: vi.fn(), onDelete: vi.fn() });
    expect(columns.map((c) => c.headerName)).toEqual(['Name', 'Slug', 'Icon', 'Sort order', 'Status', 'Events', 'Actions']);
  });

  it('shows the icon name, or a dash when there is none', () => {
    const icon = column(buildCategoryColumns(portalT, { onEdit: vi.fn(), onDelete: vi.fn() }), 'icon');
    expect(icon.valueGetter?.(makeCategory())).toBe('MusicNote');
    expect(icon.valueGetter?.(makeCategory({ icon: null }))).toBe(EM_DASH);
  });

  it('names the row actions after the category and hands the row to them', async () => {
    const user = userEvent.setup();
    const handlers = { onEdit: vi.fn(), onDelete: vi.fn() };
    const category = makeCategory();
    render(<>{column(buildCategoryColumns(portalT, handlers), 'actions').cellRenderer?.(category)}</>);
    await user.click(screen.getByRole('button', { name: 'Edit Music' }));
    await user.click(screen.getByRole('button', { name: 'Delete Music' }));
    expect(handlers.onEdit).toHaveBeenCalledWith(category);
    expect(handlers.onDelete).toHaveBeenCalledWith(category);
  });
});
