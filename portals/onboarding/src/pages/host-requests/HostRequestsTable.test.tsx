import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HostRequestsTable from './HostRequestsTable';
import type { HostRequest } from './queries';

const full: HostRequest = {
  id: '1',
  request_no: 'HOSTREQ-000001',
  host_name: 'Asha',
  host_email: 'a@b.com',
  host_phone: '999',
  super_category_name: 'For You',
  category_name: 'Sports',
  sub_category_name: 'Badminton',
  status: 'REQUESTED',
  created_at: '2026-01-02T10:00:00.000Z',
};
const sparse: HostRequest = {
  id: '2',
  request_no: 'HOSTREQ-000002',
  host_name: '',
  host_email: '',
  host_phone: '',
  super_category_name: '',
  category_name: '',
  sub_category_name: '',
  status: 'APPROVED',
  created_at: '2026-01-03T10:00:00.000Z',
};

const handlers = () => ({ onAcknowledge: vi.fn(), onApprove: vi.fn(), onReject: vi.fn() });

describe('HostRequestsTable', () => {
  it('renders rows with the category path, fallbacks and a status chip', () => {
    render(<HostRequestsTable requests={[full, sparse]} busy={false} {...handlers()} />);
    expect(screen.getByText('HOSTREQ-000001')).toBeInTheDocument();
    expect(screen.getByText('Asha')).toBeInTheDocument();
    expect(screen.getByText('For You › Sports › Badminton')).toBeInTheDocument();
    expect(screen.getByText('REQUESTED')).toBeInTheDocument();
    // sparse row falls back to dashes for name and category
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('wires the kebab acknowledge action through to the handler', () => {
    const h = handlers();
    render(<HostRequestsTable requests={[full]} busy={false} {...h} />);
    fireEvent.click(screen.getByRole('button', { name: 'Host request actions' }));
    fireEvent.click(screen.getByText('Acknowledge'));
    expect(h.onAcknowledge).toHaveBeenCalledWith(full);
  });

  it('shows an empty state', () => {
    render(<HostRequestsTable requests={[]} busy={false} {...handlers()} />);
    expect(screen.getByText('No host requests found.')).toBeInTheDocument();
  });
});
