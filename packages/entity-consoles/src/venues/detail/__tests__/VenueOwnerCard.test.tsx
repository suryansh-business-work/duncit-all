import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { formatDate } from '@duncit/app-settings';
import VenueOwnerCard from '../VenueOwnerCard';
import { makeVenue } from './fixtures';

/** The InfoRow whose caption is `label`. */
const row = (label: string) => screen.getByText(label, { selector: 'span' }).parentElement as HTMLElement;

const emptyBank = { payout_method: null, account_holder_name: '', account_number: '', ifsc_code: '', upi_id: '' };

describe('VenueOwnerCard', () => {
  it('reads the owner, their tax ids and the payout account they filed', () => {
    render(<VenueOwnerCard venue={makeVenue()} />);

    expect(screen.getByRole('heading', { name: 'Owner' })).toBeInTheDocument();
    expect(row('Name')).toHaveTextContent('Asha Rao');
    expect(row('Phone')).toHaveTextContent('+919876543210');
    expect(row('Email')).toHaveTextContent('asha@duncit.com');
    expect(row('Date of birth')).toHaveTextContent(formatDate('1990-05-14T00:00:00.000Z'));
    expect(row('Address')).toHaveTextContent('44 Residency Road, Bengaluru');
    expect(row('GSTIN')).toHaveTextContent('29ABCDE1234F1Z5');
    expect(row('PAN')).toHaveTextContent('ABCDE1234F');
    expect(row('Account holder')).toHaveTextContent('Asha Rao');
    expect(row('Account number')).toHaveTextContent('001122334455');
    expect(row('IFSC')).toHaveTextContent('HDFC0000123');
    expect(row('UPI ID')).toHaveTextContent('asha@okhdfc');
    expect(screen.queryByText('No payout account on file.')).not.toBeInTheDocument();
  });

  it('dashes the blanks of a UPI-only payout', () => {
    render(<VenueOwnerCard venue={makeVenue({ bank_account: { ...emptyBank, upi_id: 'asha@okhdfc' } })} />);

    expect(row('Account holder')).toHaveTextContent('Account holder—');
    expect(row('IFSC')).toHaveTextContent('IFSC—');
    expect(row('UPI ID')).toHaveTextContent('asha@okhdfc');
  });

  it('dashes a missing date of birth and says there is no payout account on file', () => {
    render(<VenueOwnerCard venue={makeVenue({ owner_dob: null, gstin: '', bank_account: emptyBank })} />);

    expect(row('Date of birth')).toHaveTextContent('Date of birth—');
    expect(row('GSTIN')).toHaveTextContent('GSTIN—');
    expect(screen.getByText('No payout account on file.')).toBeInTheDocument();
    expect(screen.queryByText('Account number')).not.toBeInTheDocument();
  });
});
