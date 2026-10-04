/**
 * The admin's edit form for a member's profile.
 *
 * Save stays off until something changed and everything is valid; a submit
 * that does get through with bad values (Enter in a field) is held back and
 * each bad field says why under itself — including the ones drawn by the
 * address and contact blocks, which take their errors from this form. A save
 * the page reports as failed is shown here, not swallowed.
 */
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProfileForm from '../ProfileForm';
import type { EditForm } from '../queries';
import { renderWithProviders } from './testkit';

const FORM: EditForm = {
  first_name: 'Riya',
  last_name: 'Sharma',
  email: 'riya@example.com',
  phone_extension: '+91',
  phone_number: '9876543210',
  whatsapp_extension: '',
  whatsapp_number: '',
  city: 'Pune',
  state: 'Maharashtra',
  pincode: '411001',
  zone: 'West',
  assigned_city: 'Pune',
  assigned_zones: 'West',
  bio: 'Loves pods',
  profile_photo: '',
  status: 'ACTIVE',
};

const renderForm = (
  over: Partial<Parameters<typeof ProfileForm>[0]> = {},
) => {
  const onSave = vi.fn();
  const view = renderWithProviders(
    <ProfileForm
      form={FORM}
      gender={null}
      isPetOwner={null}
      busy={false}
      opError={null}
      onSave={onSave}
      {...over}
    />,
  );
  const form = view.container.querySelector('form') as HTMLFormElement;
  return { onSave, form };
};

describe('ProfileForm', () => {
  it('keeps Save off until something changes, then saves the edited values', async () => {
    const { onSave } = renderForm();

    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeDisabled();
    // One edit is enough: Save used to stay off until a SECOND change, because
    // isValid was never read while the form was pristine.
    const firstName = screen.getByRole('textbox', { name: /First name/ });
    fireEvent.change(firstName, { target: { value: 'Riyaan' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save Changes' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toMatchObject({
      first_name: 'Riyaan',
      last_name: 'Sharma',
      state: 'Maharashtra',
      city: 'Pune',
    });
  });

  it('saves a new state with its city cleared, and a WhatsApp code picked from the list', async () => {
    const { onSave } = renderForm();

    // The WhatsApp pair is the second code/number pair in the block.
    fireEvent.mouseDown(screen.getAllByRole('combobox', { name: 'Code' })[1]);
    fireEvent.click(within(screen.getByRole('listbox')).getByText('United Kingdom'));
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'State' }));
    fireEvent.click(within(screen.getByRole('listbox')).getByText('Goa'));
    fireEvent.change(screen.getByRole('textbox', { name: 'Profile photo URL' }), {
      target: { value: 'https://cdn.duncit.com/riya.jpg' },
    });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save Changes' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toMatchObject({
      state: 'Goa',
      city: '',
      whatsapp_extension: '+44',
      phone_extension: '+91',
      profile_photo: 'https://cdn.duncit.com/riya.jpg',
    });
  });

  it('shows a save in flight', () => {
    renderForm({ busy: true });

    expect(screen.getByRole('button', { name: /Saving…/ })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Save Changes' })).toBeNull();
  });

  it('shows the error the page got back from a failed save', () => {
    renderForm({ opError: 'Email already belongs to another user' });

    expect(screen.getByRole('alert')).toHaveTextContent('Email already belongs to another user');
  });

  it('shows no error box while the last save did not fail', () => {
    renderForm();

    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('holds back a submit with invalid values and marks each bad field with its reason', async () => {
    const { onSave, form } = renderForm({
      form: {
        ...FORM,
        state: 'S'.repeat(81),
        phone_extension: 'abc',
        profile_photo: `https://cdn.duncit.com/${'p'.repeat(1000)}`,
      },
    });

    fireEvent.submit(form);

    expect(await screen.findByText('State must be 80 characters or fewer')).toBeInTheDocument();
    expect(screen.getByText('Phone code is invalid')).toBeInTheDocument();
    expect(
      screen.getByText('Profile photo URL must be 1000 characters or fewer'),
    ).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });
});
