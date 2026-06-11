import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HostCard from './HostCard';

const make = (over: Record<string, unknown>) => ({
  full_name: 'Asha', email: 'a@b.com', phone: '999', step_completed: 2, status: 'APPROVED', ...over,
});

describe('HostCard', () => {
  it('renders all status colours, tags and reviewer notes', () => {
    render(<HostCard host={make({ status: 'APPROVED', tags: ['vip'], reviewer_notes: 'ok' })} onReview={vi.fn()} />);
    render(<HostCard host={make({ status: 'REJECTED' })} onReview={vi.fn()} />);
    render(<HostCard host={make({ status: 'SUBMITTED' })} onReview={vi.fn()} />);
    render(<HostCard host={make({ status: 'DRAFT', full_name: '' })} onReview={vi.fn()} />);
    expect(screen.getByText('vip')).toBeInTheDocument();
    expect(screen.getByText('ok')).toBeInTheDocument();
    expect(screen.getByText('(Unnamed)')).toBeInTheDocument();
  });

  it('fires onReview', () => {
    const onReview = vi.fn();
    const host = make({});
    render(<HostCard host={host} onReview={onReview} />);
    fireEvent.click(screen.getByRole('button', { name: 'Review' }));
    expect(onReview).toHaveBeenCalledWith(host);
  });
});
