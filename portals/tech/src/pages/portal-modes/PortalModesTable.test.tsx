import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PortalModesTable from './PortalModesTable';
import type { PortalModeRow } from './queries';

const row = (over: Partial<PortalModeRow>): PortalModeRow =>
  ({ id: '1', key: 'tech', name: 'Tech', kind: 'PORTAL', mode: 'LIVE', note: null, url: 'https://tech.duncit.com/', updated_at: null, ...over });

describe('PortalModesTable', () => {
  it('renders links, kind labels, status and the unknown-kind fallback', () => {
    const rows = [
      row({ key: 'tech', name: 'Tech', mode: 'LIVE', url: 'https://tech.duncit.com/' }),
      row({ key: 'mweb', name: 'mWeb', kind: 'APP', mode: 'MAINTENANCE', url: 'https://mweb.duncit.com/' }),
      row({ key: 'site', name: 'Site', kind: 'WEBSITE', mode: 'DEVELOPMENT', url: null }),
      row({ key: 'odd', name: 'Odd', kind: 'OTHER' as any, url: null }),
    ];
    render(<PortalModesTable rows={rows} busyKey="tech" onChange={vi.fn()} />);

    expect(screen.getByText('tech.duncit.com').closest('a')).toHaveAttribute('href', 'https://tech.duncit.com/');
    expect(screen.getByText('App')).toBeInTheDocument();
    expect(screen.getByText('Website')).toBeInTheDocument();
    expect(screen.getByText('OTHER')).toBeInTheDocument(); // kind fallback
    // "Maintenance"/"Development" appear as both column headers and status chips.
    expect(screen.getAllByText('Maintenance').length).toBeGreaterThan(1);
    expect(screen.getAllByText('Development').length).toBeGreaterThan(1);
    expect(screen.getAllByText('—').length).toBeGreaterThan(0); // null url rows
  });

  it('emits the right mode for each switch direction', () => {
    const onChange = vi.fn();
    const rows = [
      row({ key: 'mweb', name: 'mWeb', mode: 'MAINTENANCE' }),
      row({ key: 'site', name: 'Site', mode: 'DEVELOPMENT' }),
    ];
    render(<PortalModesTable rows={rows} busyKey={null} onChange={onChange} />);
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
