import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import PayoutMethodSection from './PayoutMethodSection';
import { mountSection } from './__tests__/sectionHarness';

afterEach(cleanup);

const PAYOUT_FIELDS = ['payout_method', 'account_holder_name', 'account_number', 'ifsc_code', 'upi_id'] as const;

describe('PayoutMethodSection — before a method is chosen', () => {
  it('asks for the method and the holder name only, with their hints', () => {
    mountSection((form) => <PayoutMethodSection form={form} />);

    expect(screen.getByText("How you'll be paid for bookings at this venue once approved.")).toBeTruthy();
    expect(screen.getByRole('combobox', { name: /Payout method/ })).toBeTruthy();
    expect(screen.getByText('Letters and spaces only')).toBeTruthy();
    expect(screen.queryByText('UPI details')).toBeNull();
    expect(screen.queryByText('Bank account details')).toBeNull();
    expect(screen.queryByLabelText(/UPI ID/)).toBeNull();
    expect(screen.queryByLabelText(/Account number/)).toBeNull();
    expect(screen.queryByText('Payout details are locked after approval. Contact support to change them.')).toBeNull();
  });

  it('offers exactly the three supported rails', async () => {
    const { form } = mountSection((sectionForm) => <PayoutMethodSection form={sectionForm} />);

    fireEvent.mouseDown(screen.getByRole('combobox', { name: /Payout method/ }));
    const options = await screen.findAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual(['UPI', 'IMPS', 'NEFT']);

    fireEvent.click(screen.getByRole('option', { name: 'NEFT' }));
    await waitFor(() => expect(form().getValues('payout_method')).toBe('NEFT'));
    expect(await screen.findByText('Bank account details')).toBeTruthy();
  });

  it('shows every missing field once the section is validated', async () => {
    const { form } = mountSection((sectionForm) => <PayoutMethodSection form={sectionForm} />);

    await act(async () => {
      await form().trigger([...PAYOUT_FIELDS]);
    });

    expect(await screen.findByText('Select a payout method')).toBeTruthy();
    expect(screen.getByText('Account holder name is required')).toBeTruthy();
  });
});

describe('PayoutMethodSection — UPI', () => {
  it('asks for a UPI id under the UPI heading and validates it', async () => {
    const { form } = mountSection((sectionForm) => <PayoutMethodSection form={sectionForm} />, {
      payout_method: 'UPI',
      account_holder_name: 'Asha Rao',
      upi_id: 'asha-at-bank',
    });

    expect(screen.getByText('UPI details')).toBeTruthy();
    expect(screen.getByText('e.g. name@bank')).toBeTruthy();
    expect(screen.queryByLabelText(/IFSC code/)).toBeNull();

    await act(async () => {
      await form().trigger([...PAYOUT_FIELDS]);
    });
    expect(await screen.findByText('Enter a valid UPI ID')).toBeTruthy();
  });
});

describe('PayoutMethodSection — bank transfer', () => {
  it('asks for the account number and IFSC, upper-casing the IFSC as it is typed', async () => {
    const { form } = mountSection((sectionForm) => <PayoutMethodSection form={sectionForm} />, {
      payout_method: 'IMPS',
      account_holder_name: 'Asha Rao',
    });

    expect(screen.getByText('Bank account details')).toBeTruthy();
    expect(screen.getByText('6 to 18 digits')).toBeTruthy();
    expect(screen.getByText('Format ABCD0123456')).toBeTruthy();
    expect(screen.queryByLabelText(/UPI ID/)).toBeNull();

    fireEvent.change(screen.getByLabelText(/IFSC code/), { target: { value: 'hdfc0001234' } });
    expect(form().getValues('ifsc_code')).toBe('HDFC0001234');
  });

  it('reports a missing account number and IFSC', async () => {
    const { form } = mountSection((sectionForm) => <PayoutMethodSection form={sectionForm} />, {
      payout_method: 'NEFT',
      account_holder_name: 'Asha Rao',
    });

    await act(async () => {
      await form().trigger([...PAYOUT_FIELDS]);
    });

    expect(await screen.findByText('Account number is required')).toBeTruthy();
    expect(screen.getByText('IFSC code is required')).toBeTruthy();
  });
});

describe('PayoutMethodSection — after approval', () => {
  it('locks every payout field and says why', () => {
    mountSection((form) => <PayoutMethodSection form={form} disabled />, {
      payout_method: 'NEFT',
      account_holder_name: 'Asha Rao',
      account_number: '123456789',
      ifsc_code: 'HDFC0001234',
    });

    expect(screen.getByText('Payout details are locked after approval. Contact support to change them.')).toBeTruthy();
    expect(screen.getByLabelText(/Account holder name/)).toHaveProperty('disabled', true);
    expect(screen.getByLabelText(/Account number/)).toHaveProperty('disabled', true);
    expect(screen.getByLabelText(/IFSC code/)).toHaveProperty('disabled', true);
    expect(screen.getByRole('combobox', { name: /Payout method/ }).getAttribute('aria-disabled')).toBe('true');
  });
});
