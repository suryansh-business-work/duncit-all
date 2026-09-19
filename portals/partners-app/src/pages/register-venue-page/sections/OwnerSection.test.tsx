import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import OwnerSection from './OwnerSection';
import { mountSection } from './__tests__/sectionHarness';

afterEach(cleanup);

const OWNER_FIELDS = ['owner_name', 'owner_email', 'owner_phone', 'owner_dob', 'owner_address'] as const;

describe('OwnerSection — hints', () => {
  it('says where slot requests arrive and locks the email to the account', () => {
    mountSection((form) => <OwnerSection form={form} accountEmail="asha@duncit.com" />, {
      owner_email: 'asha@duncit.com',
    });

    expect(screen.getByText('Where slot requests arrive')).toBeTruthy();
    expect(screen.getByText('Person hosts should reach out to')).toBeTruthy();
    expect(screen.getByText('Locked to your Duncit account')).toBeTruthy();
    expect(screen.getByText('Digits only, with optional + country code')).toBeTruthy();
    expect(screen.getByText('Used for identity checks')).toBeTruthy();
    expect(screen.getByText('Correspondence address (max 500 characters)')).toBeTruthy();

    const email = screen.getByLabelText(/Owner email/) as HTMLInputElement;
    expect(email.disabled).toBe(true);
    expect(email.value).toBe('asha@duncit.com');
  });

  it('explains the email is still loading while the account has none', () => {
    mountSection((form) => <OwnerSection form={form} accountEmail="" />);

    expect(screen.getByText('Loaded from your Duncit account')).toBeTruthy();
  });
});

describe('OwnerSection — validation', () => {
  it('reports every missing owner field in place of its hint', async () => {
    const { form } = mountSection((sectionForm) => <OwnerSection form={sectionForm} accountEmail="" />);

    await act(async () => {
      await form().trigger([...OWNER_FIELDS]);
    });

    expect(await screen.findByText('Owner name is required')).toBeTruthy();
    expect(screen.getByText('Owner email is required')).toBeTruthy();
    expect(
      screen.getByText('Owner phone must contain only digits (6–15 digits) with optional + prefix')
    ).toBeTruthy();
    expect(screen.getByText('Owner DOB is required')).toBeTruthy();
    expect(screen.getByText('Owner address is required')).toBeTruthy();
    expect(screen.queryByText('Loaded from your Duncit account')).toBeNull();
  });

  it('writes the typed contact details into the form', () => {
    const { form } = mountSection((sectionForm) => <OwnerSection form={sectionForm} accountEmail="asha@duncit.com" />);

    fireEvent.change(screen.getByLabelText(/Owner name/), { target: { value: 'Asha Rao' } });
    fireEvent.change(screen.getByLabelText(/Owner phone/), { target: { value: '+919876543210' } });
    fireEvent.change(screen.getByLabelText(/Owner address/), { target: { value: '12 Main Street' } });

    expect(form().getValues(['owner_name', 'owner_phone', 'owner_address'])).toEqual([
      'Asha Rao',
      '+919876543210',
      '12 Main Street',
    ]);
  });
});
