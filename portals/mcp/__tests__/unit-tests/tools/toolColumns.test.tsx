import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { fallbackT } from '@duncit/shell';
import { buildToolColumns } from '../../../src/pages/tools/toolColumns';
import { toolInfo } from '../../mocks/fixtures';

const columns = buildToolColumns(fallbackT);
const column = (field: string) => {
  const found = columns.find((entry) => entry.field === field);
  if (!found) throw new Error(`no column ${field}`);
  return found;
};

describe('buildToolColumns', () => {
  it('lists name, title, category, risk, confirmation, availability and the reason a tool is out', () => {
    expect(columns.map((entry) => entry.field)).toEqual([
      'name',
      'title',
      'category_label',
      'risk',
      'needs_confirmation',
      'available',
      'unavailable_reason',
    ]);
  });

  it('reads yes/no columns and the risk in words', () => {
    const tool = toolInfo({ risk: 'DESTRUCTIVE', needs_confirmation: true, available: false, unavailable_reason: 'Writes are switched off' });
    expect(column('risk').valueGetter?.(tool)).toBe('Destructive');
    expect(column('needs_confirmation').valueGetter?.(tool)).toBe('Yes');
    expect(column('available').valueGetter?.(tool)).toBe('No');
    expect(column('unavailable_reason').valueGetter?.(tool)).toBe('Writes are switched off');
  });

  it('shows a dash where a usable tool has no reason to give', () => {
    expect(column('unavailable_reason').valueGetter?.(toolInfo())).toBe('—');
    expect(column('needs_confirmation').valueGetter?.(toolInfo())).toBe('No');
  });

  it('draws availability and risk as chips', () => {
    render(
      <>
        {column('available').cellRenderer?.(toolInfo({ available: true }))}
        {column('risk').cellRenderer?.(toolInfo({ risk: 'WRITE' }))}
      </>,
    );
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('Write')).toBeInTheDocument();
  });
});
