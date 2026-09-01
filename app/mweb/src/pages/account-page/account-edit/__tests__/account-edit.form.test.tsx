import { describe, expect, it, vi } from 'vitest';
import { MockedProvider } from '@apollo/client/testing/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import type { ContactSnapshot } from '@duncit/utils';
import AccountEditForm from '../account-edit.form';
import { accountEditDefaults } from '../account-edit.types';

const complete: ContactSnapshot = {
  email: 'riya@duncit.com',
  phone_extension: '+91',
  phone_number: '9876543210',
  whatsapp_extension: '+91',
  whatsapp_number: '9876543211',
};

const renderForm = (contacts: ContactSnapshot) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[]}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <AccountEditForm
          defaultValues={accountEditDefaults({ first_name: 'Riya', username: 'riya' })}
          contacts={contacts}
          onSubmit={vi.fn()}
        />
      </LocalizationProvider>
    </MockedProvider>,
  );

const saveButton = () => screen.getByRole('button', { name: /^save$/i });

/** Dirty the form so Save is held by the contact gate alone, not by `isDirty`. */
const editFirstName = async () => {
  fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Riya R' } });
  await waitFor(() => expect(screen.getByLabelText(/first name/i)).toHaveValue('Riya R'));
};

describe('AccountEditForm', () => {
  it('lists Contact details above the date of birth, with only Bio ahead of it', () => {
    const { container } = renderForm(complete);
    const text = container.textContent ?? '';

    expect(text.indexOf('Bio')).toBeLessThan(text.indexOf('Contact details'));
    expect(text.indexOf('Contact details')).toBeLessThan(text.indexOf('Date of birth'));
  });

  it('holds Save while a contact detail is missing, and says which are required', async () => {
    renderForm({ ...complete, whatsapp_number: '' });
    expect(screen.getByTestId('contact-required')).toBeInTheDocument();

    await editFirstName();
    await waitFor(() => expect(saveButton()).toBeDisabled());
  });

  it('releases Save once the account holds all three contact details', async () => {
    renderForm(complete);
    expect(screen.queryByTestId('contact-required')).not.toBeInTheDocument();

    await editFirstName();
    await waitFor(() => expect(saveButton()).toBeEnabled());
  });
});
