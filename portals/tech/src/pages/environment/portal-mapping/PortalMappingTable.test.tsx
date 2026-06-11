import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PortalMappingTable, { type PortalRow } from './PortalMappingTable';

const portal = (over: Partial<PortalRow['portal']> = {}) => ({ key: 'crm', name: 'CRM', kind: 'PORTAL' as const, ...over });
const entry = (id: string) => ({ id, name: `E${id}`, category: 'EMAIL' } as any);

describe('PortalMappingTable', () => {
  it('shows an empty state when no rows match', () => {
    render(<PortalMappingTable rows={[]} onInfo={vi.fn()} onAssign={vi.fn()} />);
    expect(screen.getByText(/No portals match/i)).toBeInTheDocument();
  });

  it('renders counts, kind fallback, and wires info (disabled when empty) + assign', () => {
    const onInfo = vi.fn(), onAssign = vi.fn();
    const rows: PortalRow[] = [
      { portal: portal({ key: 'crm', name: 'CRM' }), entries: [entry('1'), entry('2')] },
      { portal: portal({ key: 'web', name: 'Web', kind: 'WEBSITE' }), entries: [] },
      { portal: portal({ key: 'odd', name: 'Odd', kind: 'OTHER' as any }), entries: [entry('3')] },
    ];
    render(<PortalMappingTable rows={rows} onInfo={onInfo} onAssign={onAssign} />);

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
