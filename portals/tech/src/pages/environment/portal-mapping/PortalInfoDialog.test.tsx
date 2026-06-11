import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PortalInfoDialog from './PortalInfoDialog';
import type { PortalRow } from './PortalMappingTable';

const entry = (over: any) => ({ id: 'i', name: 'E', category: 'EMAIL', description: '', is_default: false, is_active: true, ...over });

describe('PortalInfoDialog', () => {
  it('renders nothing when no row is selected', () => {
    render(<PortalInfoDialog row={null} onClose={vi.fn()} />);
    expect(screen.queryByText(/assigned configs/i)).toBeNull();
  });

  it('groups entries by category and shows default/active/off + descriptions', () => {
    const row: PortalRow = {
      portal: { key: 'crm', name: 'CRM', kind: 'PORTAL' },
      entries: [
        entry({ id: '1', name: 'Mail A', category: 'EMAIL', description: 'primary', is_default: true, is_active: true }),
        entry({ id: '2', name: 'Twilio B', category: 'TWILIO', description: '', is_active: false }),
      ] as any,
    };
    render(<PortalInfoDialog row={row} onClose={vi.fn()} />);
    expect(screen.getByText(/CRM — assigned configs/i)).toBeInTheDocument();
    expect(screen.getByText('EMAIL')).toBeInTheDocument();
    expect(screen.getByText('TWILIO')).toBeInTheDocument();
    expect(screen.getByText('Default')).toBeInTheDocument();
    expect(screen.getByText('primary')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Off')).toBeInTheDocument();
  });
});
