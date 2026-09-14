import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { formatDateTime } from '@duncit/app-settings';
import HostOverviewTab from '../HostOverviewTab';
import { hostRecord } from '../../../../__tests__/fixtures';

/** The value printed under a Fact's (or document's) label. */
const valueUnder = (label: string) => screen.getByText(label).nextElementSibling;

describe('HostOverviewTab', () => {
  it('reads identity, verification, categories and payout in the editor’s order', () => {
    render(<HostOverviewTab host={hostRecord} />);

    expect(valueUnder('Full name')).toHaveTextContent('Ananya Iyer');
    expect(valueUnder('Email')).toHaveTextContent('ananya.iyer@example.com');
    expect(valueUnder('Phone')).toHaveTextContent('9820045612');
    expect(valueUnder('Date of birth')).toHaveTextContent(formatDateTime('1994-11-02'));
    expect(valueUnder('Address')).toHaveTextContent('B-702, Hiranandani Gardens, Powai, Mumbai 400076');
    expect(valueUnder('Tags')).toHaveTextContent('repeat-host');

    expect(valueUnder('Aadhaar number')).toHaveTextContent('412345678901');
    expect(valueUnder('PAN number')).toHaveTextContent('AFZPI1234K');
    expect(valueUnder('Passport photo')).toHaveAttribute(
      'href',
      'https://ik.imagekit.io/duncit/hosts/317.jpg',
    );
    const police = valueUnder('Police verification');
    expect(police).toHaveAttribute('href', 'https://ik.imagekit.io/duncit/host-documents/317.pdf');
    expect(police).toHaveAttribute('target', '_blank');
    expect(police).toHaveTextContent('Open');

    // The request number rides beside the row that came from a Host Request; a
    // row without one, and without a Sub, drops both rather than printing blanks.
    expect(screen.getByText('Social › Board Games › Catan Night · HOSTREQ-000912')).toBeInTheDocument();
    expect(screen.getByText('Social › Trivia')).toBeInTheDocument();

    expect(valueUnder('Payout method')).toHaveTextContent('UPI');
    expect(valueUnder('Account holder')).toHaveTextContent('Ananya Iyer');
    expect(valueUnder('Account number')).toHaveTextContent('—');
    expect(valueUnder('IFSC code')).toHaveTextContent('—');
    expect(valueUnder('UPI ID')).toHaveTextContent('ananya@okhdfcbank');
    expect(valueUnder('Reviewer notes')).toHaveTextContent('Police verification checked.');
  });

  it('says a host with no categories cannot be given a pod, and dashes every missing value', () => {
    render(
      <HostOverviewTab
        host={{
          ...hostRecord,
          dob: null,
          tags: [],
          passport_photo_url: '',
          police_verification_url: '',
          host_categories: [],
          bank_account: { ...hostRecord.bank_account, payout_method: null },
        }}
      />,
    );

    expect(valueUnder('Date of birth')).toHaveTextContent('—');
    expect(valueUnder('Tags')).toHaveTextContent('—');
    expect(valueUnder('Passport photo')).toHaveTextContent('—');
    expect(valueUnder('Police verification')).toHaveTextContent('—');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(
      screen.getByText('No categories yet — this host cannot be assigned a pod until they have one.'),
    ).toBeInTheDocument();
    expect(valueUnder('Payout method')).toHaveTextContent('—');
  });
});
