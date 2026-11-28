import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { HrPersonalRecord } from '@duncit/utils';
import { renderWithProviders } from '../../../../__tests__/testkit';
import { MyContactForm } from '.';

const PERSONAL: HrPersonalRecord = {
  first_name: 'Meera',
  last_name: 'Nair',
  gender: null,
  date_of_birth: null,
  personal_email: 'meera@x.com',
  phone_number: null,
  phone_extension: '+91',
  current_address: 'Indiranagar',
  permanent_address: null,
  emergency_contact: null,
};

describe('MyContactForm', () => {
  it('saves only once something changed, as HrContactInput', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    renderWithProviders(<MyContactForm personal={PERSONAL} readOnly={false} onSubmit={onSubmit} />);
    expect(screen.getByTestId('my-contact-save')).toBeDisabled();
    fireEvent.change(screen.getByTestId('my-contact-current'), { target: { value: 'HSR Layout' } });
    fireEvent.change(screen.getByTestId('my-contact-emergency-name'), { target: { value: 'Ravi' } });
    fireEvent.change(screen.getByTestId('my-contact-emergency-phone'), { target: { value: '9876500000' } });
    fireEvent.click(screen.getByTestId('my-contact-save'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({
      personal_email: 'meera@x.com',
      phone_number: null,
      phone_extension: '+91',
      current_address: 'HSR Layout',
      permanent_address: null,
      emergency_contact: { name: 'Ravi', relation: null, phone_number: '9876500000', phone_extension: '+91' },
    });
  });

  it('refuses a malformed email and half an emergency contact', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<MyContactForm personal={PERSONAL} readOnly={false} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByTestId('my-contact-email'), { target: { value: 'meera@' } });
    fireEvent.change(screen.getByTestId('my-contact-emergency-name'), { target: { value: 'Ravi' } });
    fireEvent.click(screen.getByTestId('my-contact-save'));
    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByText('Add a phone number for the emergency contact')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('is read-only once the employment has ended', () => {
    renderWithProviders(<MyContactForm personal={PERSONAL} readOnly onSubmit={vi.fn()} />);
    expect(screen.getByTestId('my-contact-email')).toBeDisabled();
    expect(screen.queryByTestId('my-contact-save')).not.toBeInTheDocument();
  });
});
