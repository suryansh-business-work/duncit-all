import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { createTranslator } from '@duncit/app-settings';
import { memberColumns, memberSearchText } from '../../../../src/pages/club-admins/memberColumns';
import { REGIONAL_FALLBACK } from '../../../../src/i18n';
import { ASHA, VIKRAM } from '../../../mocks/region';

// The translator the page hands the columns when no LocaleProvider is mounted.
const { t } = createTranslator({ locale: 'en-IN', fallback: REGIONAL_FALLBACK });

const columnsWith = (onRemove = vi.fn()) => {
  const columns = memberColumns(t, onRemove);
  const byField = (field: string) => {
    const column = columns.find((candidate) => candidate.field === field);
    if (!column) throw new Error(`no ${field} column`);
    return column;
  };
  return { columns, byField, onRemove };
};

const renderCell = (node: ReactNode) => render(<div>{node}</div>);

describe('memberSearchText', () => {
  it('matches a Club Admin by name, email or any club they run', () => {
    expect(memberSearchText(ASHA)).toBe('Asha Rao asha.rao@duncit.com Koramangala Runners HSR Book Circle');
  });
});

describe('memberColumns', () => {
  it('lays out who they are, their clubs, how many, and the row actions', () => {
    const { columns } = columnsWith();
    expect(columns.map((column) => column.field)).toEqual(['name', 'clubs', 'club_count', 'actions']);
    expect(columns.map((column) => column.headerName)).toEqual(['Club Admin', 'Clubs', 'Clubs', undefined]);
  });

  it('names a Club Admin, falling back to their email when they have set no name', () => {
    const { byField } = columnsWith();
    const name = byField('name');
    expect(name.valueGetter?.(ASHA)).toBe('Asha Rao');
    expect(name.valueGetter?.(VIKRAM)).toBe('vikram.k@duncit.com');

    renderCell(name.cellRenderer?.(VIKRAM));
    // No name: the email stands in as the heading AND stays as the address line.
    expect(screen.getAllByText('vikram.k@duncit.com')).toHaveLength(2);
  });

  it('shows the person over the address to write to', () => {
    const { byField } = columnsWith();
    renderCell(byField('name').cellRenderer?.(ASHA));
    expect(screen.getByText('Asha Rao')).toBeInTheDocument();
    expect(screen.getByText('asha.rao@duncit.com')).toBeInTheDocument();
  });

  it('lists every club as a chip, or warns when none are assigned yet', () => {
    const { byField } = columnsWith();
    const clubs = byField('clubs');
    expect(clubs.valueGetter?.(ASHA)).toBe('Koramangala Runners, HSR Book Circle');

    const { unmount } = renderCell(clubs.cellRenderer?.(ASHA));
    expect(screen.getByText('Koramangala Runners')).toBeInTheDocument();
    expect(screen.getByText('HSR Book Circle')).toBeInTheDocument();
    unmount();

    renderCell(clubs.cellRenderer?.(VIKRAM));
    expect(screen.getByText('No clubs assigned yet')).toBeInTheDocument();
  });

  it('sorts the club count as the number it is', () => {
    const { byField } = columnsWith();
    expect(byField('club_count').valueGetter?.(ASHA)).toBe(2);
  });

  it('removes a member through a button named for that person', () => {
    const { byField, onRemove } = columnsWith();
    const actions = byField('actions');

    const { unmount } = renderCell(actions.cellRenderer?.(ASHA));
    fireEvent.click(screen.getByRole('button', { name: 'Remove Asha Rao from region' }));
    expect(onRemove).toHaveBeenCalledWith(ASHA);
    unmount();

    renderCell(actions.cellRenderer?.(VIKRAM));
    expect(screen.getByRole('button', { name: 'Remove vikram.k@duncit.com from region' })).toBeInTheDocument();
  });
});
