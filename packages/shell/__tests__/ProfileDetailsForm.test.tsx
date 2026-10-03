import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PROFILE_LINKS_MAX } from '@duncit/forms/schemas';

interface UploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  uploadTestId: string;
}
// The ImageKit uploader is exercised in @duncit/media-picker; here it only has
// to hand a URL back the way the real field does.
vi.mock('@duncit/media-picker', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/media-picker')>()),
  SingleImageUploadField: ({ label, value, onChange, uploadTestId }: UploadFieldProps) => (
    <button type="button" data-testid={uploadTestId} onClick={() => onChange('https://ik.imagekit.io/new.png')}>
      {label}: {value}
    </button>
  ),
}));

import { fallbackT } from '../src/i18n/fallback';
import {
  buildProfileDetailsInput,
  profileDetailsDefaults,
  ProfileDetailsForm,
  type ProfileDetailsValues,
} from '../src/chrome/ProfilePage/details/profile-details';

const DEFAULTS: ProfileDetailsValues = {
  first_name: 'Ada',
  last_name: '',
  profile_photo: '',
  bio: '',
  profile_links: [{ label: '', url: '' }],
};

function renderForm(onSubmit = vi.fn().mockResolvedValue(undefined), onCancel = vi.fn()) {
  render(<ProfileDetailsForm defaultValues={DEFAULTS} onSubmit={onSubmit} onCancel={onCancel} />);
  return { onSubmit, onCancel };
}

describe('profileDetailsDefaults', () => {
  it('starts from the session user and the saved details', () => {
    expect(
      profileDetailsDefaults(
        { first_name: 'Ada', last_name: 'Lovelace', profile_photo: 'https://ik.imagekit.io/a.png' },
        {
          user_id: 'u1',
          bio: 'Hi',
          profile_visibility: 'PUBLIC',
          profile_links: [{ label: 'Site', url: 'https://ada.test' }],
        },
      ),
    ).toEqual({
      first_name: 'Ada',
      last_name: 'Lovelace',
      profile_photo: 'https://ik.imagekit.io/a.png',
      bio: 'Hi',
      profile_links: [{ label: 'Site', url: 'https://ada.test' }],
    });
  });

  it('gives blank fields and one empty link row when nothing is loaded', () => {
    expect(profileDetailsDefaults(null, null)).toEqual({
      first_name: '',
      last_name: '',
      profile_photo: '',
      bio: '',
      profile_links: [{ label: '', url: '' }],
    });
  });

  it('keeps one empty link row when the saved list is empty', () => {
    expect(
      profileDetailsDefaults({ first_name: 'Ada' }, { user_id: 'u1', bio: null, profile_visibility: null, profile_links: [] })
        .profile_links,
    ).toEqual([{ label: '', url: '' }]);
  });
});

describe('buildProfileDetailsInput', () => {
  it('drops blank link rows, trims links and clears an empty photo', () => {
    expect(
      buildProfileDetailsInput({
        first_name: 'Ada',
        last_name: 'L',
        bio: 'Hi',
        profile_photo: '',
        profile_links: [
          { label: ' Site ', url: ' https://ada.test ' },
          { label: '', url: '' },
        ],
      }),
    ).toEqual({
      first_name: 'Ada',
      last_name: 'L',
      bio: 'Hi',
      profile_photo: null,
      profile_links: [{ label: 'Site', url: 'https://ada.test' }],
    });
  });

  it('keeps a chosen photo URL', () => {
    expect(buildProfileDetailsInput({ ...DEFAULTS, profile_photo: 'https://ik.imagekit.io/a.png' }).profile_photo).toBe(
      'https://ik.imagekit.io/a.png',
    );
  });
});

describe('ProfileDetailsForm', () => {
  it('refuses an empty first name and does not submit', async () => {
    const u = userEvent.setup();
    const { onSubmit } = renderForm();

    await u.clear(screen.getByTestId('field-first_name'));
    await u.click(screen.getByTestId('account-edit-submit'));

    expect(await screen.findByText(fallbackT('mweb.accountEdit.validation.firstNameRequired'))).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('asks for the URL of a half-filled link row', async () => {
    const u = userEvent.setup();
    const { onSubmit } = renderForm();

    await u.type(screen.getByRole('textbox', { name: 'Label' }), 'Site');
    await u.click(screen.getByTestId('account-edit-submit'));

    expect(await screen.findByText(fallbackT('mweb.accountEdit.validation.linkUrlRequired'))).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('adds link rows up to the server limit, then hides Add', async () => {
    const u = userEvent.setup();
    renderForm();

    for (let i = 1; i < PROFILE_LINKS_MAX; i += 1) {
      await u.click(screen.getByTestId('profile-link-add'));
    }
    expect(screen.getAllByRole('textbox', { name: 'Label' })).toHaveLength(PROFILE_LINKS_MAX);
    expect(screen.queryByTestId('profile-link-add')).not.toBeInTheDocument();
  });

  it('removes the chosen link row', async () => {
    const u = userEvent.setup();
    renderForm();

    await u.click(screen.getByTestId('profile-link-add'));
    await u.type(screen.getAllByRole('textbox', { name: 'Label' })[1], 'Second');
    await u.click(screen.getByRole('button', { name: 'Remove link 1' }));

    const labels = screen.getAllByRole('textbox', { name: 'Label' });
    expect(labels).toHaveLength(1);
    expect(labels[0]).toHaveValue('Second');
  });

  it('submits the uploaded photo with the rest of the values', async () => {
    const u = userEvent.setup();
    const { onSubmit } = renderForm();

    await u.click(screen.getByTestId('profile-photo-upload'));
    expect(screen.getByTestId('profile-photo-upload')).toHaveTextContent('https://ik.imagekit.io/new.png');
    await u.type(screen.getByTestId('field-bio'), 'Engines');
    await u.click(screen.getByTestId('account-edit-submit'));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        first_name: 'Ada',
        last_name: '',
        profile_photo: 'https://ik.imagekit.io/new.png',
        bio: 'Engines',
        profile_links: [{ label: '', url: '' }],
      }),
    );
  });

  it('shows a thrown Error message under the form', async () => {
    const u = userEvent.setup();
    renderForm(vi.fn().mockRejectedValue(new Error('Name already taken')));

    await u.click(screen.getByTestId('account-edit-submit'));
    expect(await screen.findByTestId('account-edit-error')).toHaveTextContent('Name already taken');
  });

  it('falls back to the generic message when something other than an Error is thrown', async () => {
    const u = userEvent.setup();
    renderForm(vi.fn().mockRejectedValue('boom'));

    await u.click(screen.getByTestId('account-edit-submit'));
    expect(await screen.findByTestId('account-edit-error')).toHaveTextContent(
      'Something went wrong. Please try again.',
    );
  });

  it('clears an earlier error on the next attempt', async () => {
    const u = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValueOnce(new Error('Try later')).mockResolvedValueOnce(undefined);
    renderForm(onSubmit);

    await u.click(screen.getByTestId('account-edit-submit'));
    expect(await screen.findByTestId('account-edit-error')).toBeInTheDocument();
    await u.click(screen.getByTestId('account-edit-submit'));
    await waitFor(() => expect(screen.queryByTestId('account-edit-error')).not.toBeInTheDocument());
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it('disables both buttons and says Saving… while the save is in flight', async () => {
    const u = userEvent.setup();
    let finish: () => void = () => undefined;
    const onSubmit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    renderForm(onSubmit);

    await u.click(screen.getByTestId('account-edit-submit'));
    await waitFor(() => expect(screen.getByTestId('account-edit-submit')).toHaveTextContent('Saving…'));
    expect(screen.getByTestId('account-edit-submit')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();

    finish();
    await waitFor(() => expect(screen.getByTestId('account-edit-submit')).toHaveTextContent('Save'));
    expect(screen.getByTestId('account-edit-submit')).toBeEnabled();
  });

  it('cancels', async () => {
    const u = userEvent.setup();
    const { onCancel, onSubmit } = renderForm();

    await u.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
