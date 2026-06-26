import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HostRequestRowActions from './HostRequestRowActions';
import type { HostRequest } from './queries';

const base: HostRequest = {
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

const handlers = () => ({ onAcknowledge: vi.fn(), onApprove: vi.fn(), onReject: vi.fn() });

describe('HostRequestRowActions', () => {
  it('offers Acknowledge for a REQUESTED request', () => {
    const h = handlers();
    render(<HostRequestRowActions request={base} busy={false} {...h} />);
    fireEvent.click(screen.getByRole('button', { name: 'Host request actions' }));
    fireEvent.click(screen.getByText('Acknowledge'));
    expect(h.onAcknowledge).toHaveBeenCalledWith(base);
  });

  it('offers Approve and Reject for an ACKNOWLEDGED request', () => {
    const h = handlers();
    const req = { ...base, status: 'ACKNOWLEDGED' as const };
    render(<HostRequestRowActions request={req} busy={false} {...h} />);
    fireEvent.click(screen.getByRole('button', { name: 'Host request actions' }));
    fireEvent.click(screen.getByText('Approve'));
    expect(h.onApprove).toHaveBeenCalledWith(req);
  });

  it('reopens and fires Reject for an ACKNOWLEDGED request', () => {
    const h = handlers();
    const req = { ...base, status: 'ACKNOWLEDGED' as const };
    render(<HostRequestRowActions request={req} busy={false} {...h} />);
    fireEvent.click(screen.getByRole('button', { name: 'Host request actions' }));
    fireEvent.click(screen.getByText('Reject'));
    expect(h.onReject).toHaveBeenCalledWith(req);
  });

  it('closes the menu without firing an action on backdrop close', () => {
    const h = handlers();
    render(<HostRequestRowActions request={base} busy={false} {...h} />);
    fireEvent.click(screen.getByRole('button', { name: 'Host request actions' }));
    fireEvent.keyDown(screen.getByText('Acknowledge'), { key: 'Escape', code: 'Escape' });
    expect(h.onAcknowledge).not.toHaveBeenCalled();
  });

  it('disables the kebab while busy', () => {
    render(<HostRequestRowActions request={base} busy {...handlers()} />);
    expect(screen.getByRole('button', { name: 'Host request actions' })).toBeDisabled();
  });

  it('shows a dash with no actions for a terminal request', () => {
    render(<HostRequestRowActions request={{ ...base, status: 'APPROVED' }} busy={false} {...handlers()} />);
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows a dash for a rejected request too', () => {
    render(<HostRequestRowActions request={{ ...base, status: 'REJECTED' }} busy={false} {...handlers()} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
