import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LeadTabs from '@/components/LeadTabs';

// LeadTabs drives its selection through `useTabParam`, which reads and writes
// `?selectedtab=` via react-router's `useSearchParams` — so it only mounts
// inside a Router, exactly as the portal mounts it.
const renderTabs = (ui: ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('LeadTabs', () => {
  const tabs = [
    { value: 'overview', label: 'Overview', render: () => <div>Overview body</div> },
    { value: 'logs', label: 'Manual Logs', render: () => <div>Logs body</div> },
    { value: 'comms', label: 'Communications', render: () => <div>Comms body</div> },
  ];

  it('renders every tab heading and the default panel', () => {
    renderTabs(<LeadTabs tabs={tabs} />);
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Manual Logs')).toBeInTheDocument();
    expect(screen.getByText('Communications')).toBeInTheDocument();
    expect(screen.getByText('Overview body')).toBeInTheDocument();
    expect(screen.queryByText('Logs body')).not.toBeInTheDocument();
  });

  it('switches the visible panel when a tab is clicked', () => {
    renderTabs(<LeadTabs tabs={tabs} />);
    fireEvent.click(screen.getByText('Manual Logs'));
    expect(screen.getByText('Logs body')).toBeInTheDocument();
    expect(screen.queryByText('Overview body')).not.toBeInTheDocument();
  });

  it('honours `defaultValue`', () => {
    renderTabs(<LeadTabs tabs={tabs} defaultValue="comms" />);
    expect(screen.getByText('Comms body')).toBeInTheDocument();
  });

  it('puts the clicked tab in the URL so a reload reopens it', () => {
    renderTabs(<LeadTabs tabs={tabs} />);
    fireEvent.click(screen.getByText('Communications'));
    expect(screen.getByTestId('lead-tabpanel-comms')).toBeInTheDocument();
  });

  it('opens the tab named by the URL over `defaultValue`', () => {
    render(
      <MemoryRouter initialEntries={['/lead/1?selectedtab=logs']}>
        <LeadTabs tabs={tabs} defaultValue="comms" />
      </MemoryRouter>,
    );
    expect(screen.getByText('Logs body')).toBeInTheDocument();
    expect(screen.queryByText('Comms body')).not.toBeInTheDocument();
  });
});
