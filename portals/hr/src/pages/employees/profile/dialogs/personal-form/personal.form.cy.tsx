import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { HrPersonalRecord } from '@duncit/utils';
import { renderWithProviders } from '../../../../../../__tests__/testkit';
import { PersonalForm } from '.';

const PERSONAL: HrPersonalRecord = {
  first_name: 'Meera',
  last_name: 'Nair',
  gender: 'FEMALE',
  date_of_birth: '1995-06-15',
  personal_email: 'meera@x.com',
  phone_number: '9876543210',
  phone_extension: '+91',
  current_address: 'Indiranagar',
  permanent_address: null,
  emergency_contact: { name: 'Ravi', relation: 'Brother', phone_number: '9876500000', phone_extension: '+91' },
};

describe('PersonalForm', () => {
  it('opens with the stored details and saves the change as HrPersonalInput', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    renderWithProviders(<PersonalForm personal={PERSONAL} onSubmit={onSubmit} onCancel={vi.fn()} />);
    expect(screen.getByTestId('hr-first-name')).toHaveValue('Meera');
    fireEvent.change(screen.getByTestId('hr-current-address'), { target: { value: 'HSR Layout' } });
    fireEvent.click(screen.getByTestId('hr-personal-form-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({
      first_name: 'Meera',
      last_name: 'Nair',
      gender: 'FEMALE',
      date_of_birth: '1995-06-15',
      personal_email: 'meera@x.com',
      phone_number: '9876543210',
      phone_extension: '+91',
      current_address: 'HSR Layout',
      permanent_address: null,
      emergency_contact: { name: 'Ravi', relation: 'Brother', phone_number: '9876500000', phone_extension: '+91' },
    });
  });

  it('refuses a blank last name and half an emergency contact, field by field', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<PersonalForm personal={PERSONAL} onSubmit={onSubmit} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByTestId('hr-last-name'), { target: { value: ' ' } });
    fireEvent.change(screen.getByTestId('hr-emergency-phone'), { target: { value: '' } });
    fireEvent.click(screen.getByTestId('hr-personal-form-submit'));
    expect(await screen.findByText('This field is required')).toBeInTheDocument();
    expect(screen.getByText('Add a phone number for the emergency contact')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('cancels without saving', () => {
    const onCancel = vi.fn();
    renderWithProviders(<PersonalForm personal={PERSONAL} onSubmit={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByTestId('hr-personal-form-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
