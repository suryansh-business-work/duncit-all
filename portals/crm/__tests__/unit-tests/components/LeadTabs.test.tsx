import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import LeadTabs from '@/components/LeadTabs';

describe('LeadTabs', () => {
  const tabs = [
    { value: 'overview', label: 'Overview', render: () => <div>Overview body</div> },
    { value: 'logs', label: 'Manual Logs', render: () => <div>Logs body</div> },
    { value: 'comms', label: 'Communications', render: () => <div>Comms body</div> },
  ];

  it('renders every tab heading and the default panel', () => {
    render(<LeadTabs tabs={tabs} />);
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Manual Logs')).toBeInTheDocument();
    expect(screen.getByText('Communications')).toBeInTheDocument();
    expect(screen.getByText('Overview body')).toBeInTheDocument();
    expect(screen.queryByText('Logs body')).not.toBeInTheDocument();
  });

  it('switches the visible panel when a tab is clicked', () => {
    render(<LeadTabs tabs={tabs} />);
    fireEvent.click(screen.getByText('Manual Logs'));
    expect(screen.getByText('Logs body')).toBeInTheDocument();
    expect(screen.queryByText('Overview body')).not.toBeInTheDocument();
  });

  it('honours `defaultValue`', () => {
    render(<LeadTabs tabs={tabs} defaultValue="comms" />);
    expect(screen.getByText('Comms body')).toBeInTheDocument();
  });
});
