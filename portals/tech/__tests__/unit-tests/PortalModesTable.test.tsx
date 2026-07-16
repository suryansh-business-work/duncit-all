import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PortalModesTable from '../../src/pages/portal-modes/PortalModesTable';
import type { PortalModeRow } from '../../src/pages/portal-modes/queries';
import { makePortalModeRow } from '../mocks/portal-mode.mock';

const fetchFor = (rows: PortalModeRow[]) => vi.fn(async () => ({ rows, total: rows.length }));

beforeEach(() => {
  window.localStorage.clear();
});

describe('PortalModesTable', () => {
  it('renders links, status chips and the unknown-kind fallback', async () => {
    const rows = [
      makePortalModeRow({ key: 'tech', name: 'Tech', mode: 'LIVE', url: 'https://tech.duncit.com/' }),
      makePortalModeRow({ key: 'mweb', name: 'mWeb', kind: 'APP', mode: 'MAINTENANCE', url: 'https://mweb.duncit.com/' }),
      makePortalModeRow({ key: 'site', name: 'Site', kind: 'WEBSITE', mode: 'DEVELOPMENT', url: null }),
      makePortalModeRow({ key: 'odd', name: 'Odd', kind: 'OTHER' as unknown as PortalModeRow['kind'], url: null }),
    ];
    render(<PortalModesTable fetchRows={fetchFor(rows)} refetchRef={{ current: null }} busyKey="tech" onChange={vi.fn()} />);

    expect((await screen.findByText('tech.duncit.com')).closest('a')).toHaveAttribute('href', 'https://tech.duncit.com/');
    expect(screen.getByText('App')).toBeInTheDocument();
    expect(screen.getByText('Website')).toBeInTheDocument();
    expect(screen.getByText('OTHER')).toBeInTheDocument(); // kind fallback
    // "Maintenance"/"Development" appear as both column headers and status chips.
    expect(screen.getAllByText('Maintenance').length).toBeGreaterThan(1);
    expect(screen.getAllByText('Development').length).toBeGreaterThan(1);
    expect(screen.getAllByText('Live').length).toBe(2); // tech + odd rows are LIVE
    expect(screen.getAllByText('—').length).toBeGreaterThan(0); // null url rows
    // The busy row's switches are disabled; others stay interactive.
    const switches = screen.getAllByRole('checkbox');
    expect(switches[0]).toBeDisabled();
    expect(switches[1]).toBeDisabled();
    expect(switches[2]).not.toBeDisabled();
  });

  it('emits the right mode for each switch direction', async () => {
    const onChange = vi.fn();
    const rows = [
      makePortalModeRow({ key: 'mweb', name: 'mWeb', mode: 'MAINTENANCE' }),
      makePortalModeRow({ key: 'site', name: 'Site', mode: 'DEVELOPMENT' }),
    ];
    render(<PortalModesTable fetchRows={fetchFor(rows)} refetchRef={{ current: null }} busyKey={null} onChange={onChange} />);
    await screen.findByText('mWeb');
    // switches order per row: [maintenance, development]
    const sw = screen.getAllByRole('checkbox');
    fireEvent.click(sw[0]); // mweb maintenance ON→OFF → LIVE
    fireEvent.click(sw[1]); // mweb development OFF→ON → DEVELOPMENT
    fireEvent.click(sw[2]); // site maintenance OFF→ON → MAINTENANCE
    fireEvent.click(sw[3]); // site development ON→OFF → LIVE
    const modes = onChange.mock.calls.map((c) => c[1]);
    expect(modes).toEqual(['LIVE', 'DEVELOPMENT', 'MAINTENANCE', 'LIVE']);
  });
});
