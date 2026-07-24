import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const m = vi.hoisted(() => ({
  query: {
    data: undefined as unknown,
    loading: false,
    error: undefined as Error | undefined,
    refetch: vi.fn(),
  },
  mutate: vi.fn(),
}));
vi.mock('@apollo/client', async (io) => {
  const actual = await io<typeof import('@apollo/client')>();
  return {
    ...actual,
    useQuery: () => m.query,
    useMutation: () => [m.mutate, { loading: false }],
  };
});

import WarehouseApprovalPage from '../../src/pages/warehouse-approval';

const rows = [
  {
    __typename: 'ApprovalRequest',
    id: '1',
    status: 'PENDING',
    title: 'Warehouse approval — WH A',
    summary: 'New warehouse awaiting approval',
    requested_by_name: 'Asha',
    created_at: '2026-07-24T10:00:00.000Z',
  },
  {
    __typename: 'ApprovalRequest',
    id: '2',
    status: 'APPROVED',
    title: 'WH B',
    summary: 'live',
    requested_by_name: null,
    created_at: null,
  },
  {
    __typename: 'ApprovalRequest',
    id: '3',
    status: 'WEIRD',
    title: 'WH C',
    summary: 'odd status + bad date',
    requested_by_name: null,
    created_at: 'not-a-date',
  },
];

beforeEach(() => {
  m.query = { data: undefined, loading: false, error: undefined, refetch: vi.fn().mockResolvedValue({}) };
  m.mutate = vi.fn().mockResolvedValue({});
});

describe('WarehouseApprovalPage', () => {
  it('shows a spinner while loading with no data', () => {
    m.query = { data: undefined, loading: true, error: undefined, refetch: vi.fn() };
    render(<WarehouseApprovalPage />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows an error alert when the query fails', () => {
    m.query = { data: undefined, loading: false, error: new Error('down'), refetch: vi.fn() };
    render(<WarehouseApprovalPage />);
    expect(screen.getByText('down')).toBeInTheDocument();
  });

  it('shows the empty state when there are no requests', () => {
    m.query = { data: { warehouseApprovalRequests: [] }, loading: false, error: undefined, refetch: vi.fn() };
    render(<WarehouseApprovalPage />);
    expect(screen.getByText('No warehouse requests.')).toBeInTheDocument();
  });

  it('renders name/date/status variants and approves + denies a pending request', () => {
    m.query = {
      data: { warehouseApprovalRequests: rows },
      loading: false,
      error: undefined,
      refetch: vi.fn().mockResolvedValue({}),
    };
    render(<WarehouseApprovalPage />);
    expect(screen.getByText('Warehouse approval — WH A')).toBeInTheDocument();
    expect(screen.getByText(/By Asha/)).toBeInTheDocument();
    // Only the PENDING row exposes the actions.
    expect(screen.getAllByRole('button', { name: 'Approve' })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    fireEvent.click(screen.getByRole('button', { name: 'Deny' }));
    expect(m.mutate).toHaveBeenCalledWith({ variables: { id: '1' } });
    expect(m.mutate).toHaveBeenCalledTimes(2);
  });

  it('swallows a failed decision', async () => {
    m.query = {
      data: { warehouseApprovalRequests: [rows[0]] },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    };
    m.mutate = vi.fn().mockRejectedValue(new Error('nope'));
    render(<WarehouseApprovalPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await Promise.resolve();
    expect(m.mutate).toHaveBeenCalledTimes(1);
  });

  it('toggles the status filter, including the ALL (null status) branch', () => {
    m.query = { data: { warehouseApprovalRequests: [] }, loading: false, error: undefined, refetch: vi.fn() };
    render(<WarehouseApprovalPage />);
    fireEvent.click(screen.getByRole('button', { name: 'APPROVED' }));
    expect(screen.getByRole('button', { name: 'APPROVED' })).toHaveClass('Mui-selected');
    fireEvent.click(screen.getByRole('button', { name: 'ALL' }));
    expect(screen.getByRole('button', { name: 'ALL' })).toHaveClass('Mui-selected');
  });
});
