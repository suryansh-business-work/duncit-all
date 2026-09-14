import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { formatDateTime } from '@duncit/app-settings';
import HostSummaryCard from '../HostSummaryCard';
import { hostRecord } from '../../../../__tests__/fixtures';

/** The value printed under a Fact's label. */
const factValue = (label: string) =>
  screen.getByText(label, { selector: '.MuiTypography-caption' }).nextElementSibling;

describe('HostSummaryCard', () => {
  it('reads the status, the live flag, the HOST- id, the contact, the commission and both dates', () => {
    render(<HostSummaryCard host={hostRecord} />);

    expect(screen.getByText('Approved', { selector: '.MuiChip-label' })).toBeInTheDocument();
    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(factValue('Host ID')).toHaveTextContent('HOST-000317');
    expect(factValue('Contact')).toHaveTextContent('ananya.iyer@example.com');
    expect(factValue('Owner phone')).toHaveTextContent('9820045612');
    expect(factValue('Commission')).toHaveTextContent('12%');
    expect(factValue('Applied')).toHaveTextContent(formatDateTime(hostRecord.created_at));
    expect(factValue('Approved')).toHaveTextContent(formatDateTime('2026-03-06T10:05:00.000Z'));
  });

  it.each([
    ['DRAFT', 'Draft'],
    ['SUBMITTED', 'Awaiting review'],
    ['REJECTED', 'Rejected'],
  ] as const)('chips a %s application as "%s"', (status, label) => {
    render(<HostSummaryCard host={{ ...hostRecord, status }} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('reads a paused host with no id, an inherited commission and no dates as em-dashes', () => {
    render(
      <HostSummaryCard
        host={{
          ...hostRecord,
          is_active: false,
          host_no: null,
          host_commission_pct: null,
          created_at: '',
          approved_at: null,
        }}
      />,
    );

    expect(screen.getByText('Paused')).toBeInTheDocument();
    expect(factValue('Host ID')).toHaveTextContent('—');
    expect(factValue('Commission')).toHaveTextContent('Platform default');
    expect(factValue('Applied')).toHaveTextContent('—');
    expect(factValue('Approved')).toHaveTextContent('—');
  });
});
