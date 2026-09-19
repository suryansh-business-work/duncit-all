import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import VenueDeductionsPanel from './VenueDeductionsPanel';

const commissionInput = () => screen.getByLabelText('Venue commission percentage');
const saveButton = () => screen.getByRole('button', { name: 'Save deductions' });

const venue = { id: 'v1', venue_name: 'The Loft', venue_commission_pct: 0, venue_share_pct: 70 };

describe('VenueDeductionsPanel', () => {
  // A stored 0 means "follow Finance → Default Deductions".
  it('seeds the finance default, and only offers Save once the number moves', () => {
    const onSaveDeductions = vi.fn();
    render(
      <VenueDeductionsPanel
        active={venue}
        onSaveDeductions={onSaveDeductions}
        saving={false}
        defaultCommissionPct={15}
      />,
    );
    expect(screen.getByText(/Defaults to the 15% set in Finance/)).toBeInTheDocument();
    expect(commissionInput()).toHaveValue(15);
    expect(saveButton()).toBeDisabled();

    fireEvent.change(commissionInput(), { target: { value: '20' } });
    expect(saveButton()).toBeEnabled();
    fireEvent.click(saveButton());
    expect(onSaveDeductions).toHaveBeenCalledWith(70, 20);
  });

  it('starts from the venue’s own override when it has one', () => {
    const onSaveDeductions = vi.fn();
    render(
      <VenueDeductionsPanel
        active={{ id: 'v2', venue_commission_pct: 12 }}
        onSaveDeductions={onSaveDeductions}
        saving={false}
        defaultCommissionPct={15}
      />,
    );
    expect(commissionInput()).toHaveValue(12);
    fireEvent.change(commissionInput(), { target: { value: '0' } });
    fireEvent.click(saveButton());
    // No share on record: the venue keeps a 0 share.
    expect(onSaveDeductions).toHaveBeenCalledWith(0, 0);
  });

  it('refuses anything that is not a number from 0 to 100', () => {
    render(
      <VenueDeductionsPanel active={venue} onSaveDeductions={vi.fn()} saving={false} defaultCommissionPct={15} />,
    );
    const hint = 'Enter a number between 0 and 100.';
    for (const bad of ['', '150', '-1']) {
      fireEvent.change(commissionInput(), { target: { value: bad } });
      expect(screen.getByText(hint)).toBeInTheDocument();
      expect(saveButton()).toBeDisabled();
    }
    fireEvent.change(commissionInput(), { target: { value: '18' } });
    expect(screen.queryByText(hint)).not.toBeInTheDocument();
  });

  // The finance default arrives with its query; the field waits for it rather
  // than seeding a misleading 0, and keeps what the reviewer typed afterwards.
  it('waits for the finance default, then keeps the reviewer’s edit across a refresh', () => {
    const props = { onSaveDeductions: vi.fn(), saving: false };
    const { rerender } = render(<VenueDeductionsPanel active={venue} {...props} />);
    expect(screen.getByText(/Defaults to the —% set in Finance/)).toBeInTheDocument();
    expect(commissionInput()).toHaveValue(null);

    rerender(<VenueDeductionsPanel active={venue} {...props} defaultCommissionPct={15} />);
    expect(commissionInput()).toHaveValue(15);

    fireEvent.change(commissionInput(), { target: { value: '22' } });
    rerender(<VenueDeductionsPanel active={{ ...venue }} {...props} defaultCommissionPct={15} />);
    expect(commissionInput()).toHaveValue(22);
  });

  // The review dialog keeps its content mounted while it closes, with no venue.
  it('survives the dialog closing on it, and reseeds the next venue', () => {
    const props = { onSaveDeductions: vi.fn(), saving: false, defaultCommissionPct: 15 };
    const { rerender } = render(<VenueDeductionsPanel active={venue} {...props} />);
    fireEvent.change(commissionInput(), { target: { value: '30' } });

    rerender(<VenueDeductionsPanel active={null} {...props} />);
    expect(screen.getByText('Venue deductions')).toBeInTheDocument();

    rerender(<VenueDeductionsPanel active={{ ...venue, venue_commission_pct: 9 }} {...props} />);
    expect(commissionInput()).toHaveValue(9);
  });
});
