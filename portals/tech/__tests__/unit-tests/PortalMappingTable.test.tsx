import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PortalMappingTable, { type PortalRow } from '../../src/pages/environment/portal-mapping/PortalMappingTable';
import { makeEnvEntry, makePortalListItem, makePortalRow } from '../mocks/env-entry.mock';

const fetchFor = (rows: PortalRow[]) => vi.fn(async () => ({ rows, total: rows.length }));

beforeEach(() => {
  window.localStorage.clear();
});

describe('PortalMappingTable', () => {
  it('shows an empty state when no rows match', async () => {
    render(
      <PortalMappingTable fetchRows={fetchFor([])} refetchRef={{ current: null }} onInfo={vi.fn()} onAssign={vi.fn()} />,
    );
    expect(await screen.findByText(/No portals match/i)).toBeInTheDocument();
  });

  it('renders counts, kind fallback, and wires info (disabled when empty) + assign', async () => {
    const onInfo = vi.fn(),
      onAssign = vi.fn();
    const rows: PortalRow[] = [
      makePortalRow({ portal: makePortalListItem({ key: 'crm', name: 'CRM' }), entries: [makeEnvEntry({ id: '1' }), makeEnvEntry({ id: '2' })] }),
      makePortalRow({ portal: makePortalListItem({ key: 'web', name: 'Web', kind: 'WEBSITE' }), entries: [] }),
      makePortalRow({ portal: makePortalListItem({ key: 'odd', name: 'Odd', kind: 'OTHER' as unknown as PortalRow['portal']['kind'] }), entries: [makeEnvEntry({ id: '3' })] }),
    ];
    render(
      <PortalMappingTable fetchRows={fetchFor(rows)} refetchRef={{ current: null }} onInfo={onInfo} onAssign={onAssign} />,
    );

    expect(await screen.findByText('CRM')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // assigned count
    expect(screen.getByText('Website')).toBeInTheDocument();
    expect(screen.getByText('OTHER')).toBeInTheDocument(); // kind fallback

    const infoButtons = screen.getAllByTestId('InfoOutlinedIcon').map((i) => i.closest('button')!);
    expect(infoButtons[1]).toBeDisabled(); // 'web' row has no entries
    fireEvent.click(infoButtons[0]); // 'crm' enabled
    expect(onInfo).toHaveBeenCalled();

    fireEvent.click(screen.getAllByRole('button', { name: /Assign/i })[0]);
    expect(onAssign).toHaveBeenCalled();
  });
});
