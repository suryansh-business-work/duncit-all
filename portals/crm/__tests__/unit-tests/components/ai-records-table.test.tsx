import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AiRecordsTable, { type AiRow } from '@/components/ai-records/AiRecordsTable';

const row = (overrides: Partial<AiRow>): AiRow => ({
  _id: 0,
  name: 'Sunset Courts',
  city: 'Bengaluru',
  full_address: '12 Church Street',
  mobile: '9000000001',
  email: 'meera@sunsetcourts.example',
  lead_status: 'New',
  priority: 'High',
  _raw: {},
  ...overrides,
});

const headers = () => screen.getAllByRole('columnheader').map((h) => h.textContent);

describe('AiRecordsTable', () => {
  it('lists venue leads with a venue name and an address column', () => {
    render(<AiRecordsTable entity="VENUE_LEAD" rows={[row({})]} onChange={vi.fn()} />);

    expect(headers()).toEqual(['Venue name', 'City', 'Address', 'Mobile', 'Email', 'Status', 'Priority', 'Issue']);
    expect(screen.getByRole('gridcell', { name: 'Sunset Courts' })).toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: '12 Church Street' })).toBeInTheDocument();
  });

  it('lists host leads by host name, with no address column', () => {
    render(<AiRecordsTable entity="HOST_LEAD" rows={[row({ name: 'Vikram N' })]} onChange={vi.fn()} />);

    expect(headers()).toEqual(['Host name', 'City', 'Mobile', 'Email', 'Status', 'Priority', 'Issue']);
    expect(screen.getByRole('gridcell', { name: 'Vikram N' })).toBeInTheDocument();
  });

  it('flags a row whose save failed and shows why', () => {
    render(
      <AiRecordsTable
        entity="VENUE_LEAD"
        rows={[row({}), row({ _id: 1, name: 'Lake View', _error: 'City is required' })]}
        onChange={vi.fn()}
      />,
    );

    const failed = screen.getByRole('gridcell', { name: 'City is required' }).closest('[role="row"]');
    const fine = screen.getByRole('gridcell', { name: 'Sunset Courts' }).closest('[role="row"]');
    expect(failed).toHaveClass('row-error');
    expect(fine).not.toHaveClass('row-error');
  });

  it('hands back every row with only the edited one changed', async () => {
    const onChange = vi.fn();
    const other = row({ _id: 1, name: 'Lake View' });
    render(<AiRecordsTable entity="HOST_LEAD" rows={[row({}), other]} onChange={onChange} />);

    fireEvent.doubleClick(screen.getByRole('gridcell', { name: 'Sunset Courts' }));
    const input = await screen.findByRole('textbox');
    fireEvent.change(input, { target: { value: 'Sunrise Courts' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    const [next] = onChange.mock.calls[0] as [AiRow[]];
    expect(next).toHaveLength(2);
    expect(next[0]).toMatchObject({ _id: 0, name: 'Sunrise Courts', city: 'Bengaluru' });
    expect(next[1]).toBe(other);
  });
});
