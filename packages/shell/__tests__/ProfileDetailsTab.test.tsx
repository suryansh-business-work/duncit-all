import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ShellUser } from '../src/chrome/user-display';

const apollo = vi.hoisted(() => ({ useQuery: vi.fn(), useMutation: vi.fn() }));
vi.mock('@apollo/client/react', () => apollo);

const userCtx = vi.hoisted(() => ({
  user: null as ShellUser,
  refetch: vi.fn(),
  logout: vi.fn(),
}));
vi.mock('@duncit/user-context', () => ({ useUserData: () => userCtx }));

// ProfileLanguage has its own suite — with the flag off it renders nothing.
vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useFeatureFlag: () => false,
}));

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

import { DetailsTab } from '../src/chrome/ProfilePage/details/DetailsTab';
import {
  MY_PROFILE_DETAILS,
  SET_PROFILE_VISIBILITY,
  UPDATE_MY_PROFILE,
  type ProfileDetails,
} from '../src/chrome/ProfilePage/queries';

interface QueryState {
  data: { me: ProfileDetails | null } | undefined;
  error: Error | undefined;
}

const query: QueryState = { data: undefined, error: undefined };
const detailsRefetch = vi.fn();
const saveProfile = vi.fn();
const setVisibility = vi.fn();
const mutationLoading = { visibility: false };

const DETAILS: ProfileDetails = {
  user_id: 'u1',
  bio: 'Builds engines.',
  profile_visibility: 'PRIVATE',
  profile_links: [
    { label: 'Site', url: 'https://ada.test' },
    { label: 'LinkedIn', url: 'https://linkedin.com/in/ada' },
  ],
};

beforeEach(() => {
  userCtx.user = { user_id: 'u1', first_name: 'Ada', last_name: 'Lovelace', profile_photo: '' };
  userCtx.refetch = vi.fn().mockResolvedValue(null);
  query.data = undefined;
  query.error = undefined;
  mutationLoading.visibility = false;
  detailsRefetch.mockReset().mockResolvedValue({});
  saveProfile.mockReset().mockResolvedValue({});
  setVisibility.mockReset().mockResolvedValue({});
  apollo.useQuery.mockReset().mockImplementation((doc: unknown) =>
    doc === MY_PROFILE_DETAILS
      ? { data: query.data, error: query.error, loading: false, refetch: detailsRefetch }
      : { data: undefined, loading: false },
  );
  apollo.useMutation.mockReset().mockImplementation((doc: unknown) => {
    if (doc === UPDATE_MY_PROFILE) return [saveProfile, { loading: false }];
    if (doc === SET_PROFILE_VISIBILITY) return [setVisibility, { loading: mutationLoading.visibility }];
    return [vi.fn(), { loading: false }];
  });
});

const privateSwitch = () => screen.getByRole('switch', { name: 'Private profile' });

describe('DetailsTab — reading', () => {
  it('shows the saved bio, the links (opening in a new tab) and a private profile', () => {
    query.data = { me: DETAILS };
    render(<DetailsTab roles={['SUPER_ADMIN']} />);

    expect(screen.getByTestId('profile-bio')).toHaveTextContent('Builds engines.');
    const site = screen.getByRole('link', { name: 'Site' });
    expect(site).toHaveAttribute('href', 'https://ada.test');
    expect(site).toHaveAttribute('target', '_blank');
    expect(site).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByRole('link', { name: 'LinkedIn' })).toBeInTheDocument();
    expect(privateSwitch()).toBeChecked();
    expect(screen.getByTestId('profile-role-SUPER_ADMIN')).toHaveTextContent('Super Admin');
    expect(screen.queryByTestId('profile-details-error')).not.toBeInTheDocument();
  });

  it('shows empty-state copy and a public profile before any details arrive', () => {
    render(<DetailsTab roles={[]} />);

    expect(screen.getByTestId('profile-bio')).toHaveTextContent('No bio yet.');
    expect(screen.getByText('No links added.')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(privateSwitch()).not.toBeChecked();
    expect(screen.getByText('No roles assigned.')).toBeInTheDocument();
  });

  it('reports a failed load only when there is nothing cached to show', () => {
    query.error = new Error('offline');
    const { unmount } = render(<DetailsTab roles={[]} />);
    expect(screen.getByTestId('profile-details-error')).toHaveTextContent('Could not load your profile details.');
    unmount();

    query.data = { me: DETAILS };
    render(<DetailsTab roles={[]} />);
    expect(screen.queryByTestId('profile-details-error')).not.toBeInTheDocument();
    expect(screen.getByTestId('profile-bio')).toHaveTextContent('Builds engines.');
  });
});

describe('DetailsTab — privacy switch', () => {
  it('makes a public profile private, then reloads the details', async () => {
    const u = userEvent.setup();
    query.data = { me: { ...DETAILS, profile_visibility: 'PUBLIC' } };
    render(<DetailsTab roles={[]} />);

    await u.click(privateSwitch());
    expect(setVisibility).toHaveBeenCalledWith({ variables: { visibility: 'PRIVATE' } });
    await waitFor(() => expect(detailsRefetch).toHaveBeenCalledTimes(1));
  });

  it('makes a private profile public again', async () => {
    const u = userEvent.setup();
    query.data = { me: DETAILS };
    render(<DetailsTab roles={[]} />);

    await u.click(privateSwitch());
    expect(setVisibility).toHaveBeenCalledWith({ variables: { visibility: 'PUBLIC' } });
  });

  it('shows the server error when the change is refused and does not reload', async () => {
    const u = userEvent.setup();
    setVisibility.mockRejectedValue(new Error('Not allowed right now'));
    render(<DetailsTab roles={[]} />);

    await u.click(privateSwitch());
    const section = screen.getByTestId('profile-visibility');
    expect(await within(section).findByText('Not allowed right now')).toBeInTheDocument();
    expect(detailsRefetch).not.toHaveBeenCalled();
  });

  it('swaps the switch for a spinner while the change is saving', () => {
    mutationLoading.visibility = true;
    render(<DetailsTab roles={[]} />);

    const section = screen.getByTestId('profile-visibility');
    expect(within(section).queryByRole('switch')).not.toBeInTheDocument();
    expect(within(section).getByRole('progressbar', { name: 'Loading…' })).toBeInTheDocument();
  });
});

describe('DetailsTab — editing about', () => {
  it('opens the form with the session name and saved details, saves, reloads and confirms', async () => {
    const u = userEvent.setup();
    query.data = { me: DETAILS };
    // A failed reload must not hold the form open — the save already landed.
    userCtx.refetch = vi.fn().mockRejectedValue(new Error('reload failed'));
    render(<DetailsTab roles={[]} />);

    await u.click(screen.getByTestId('account-edit'));
    expect(screen.queryByTestId('account-edit')).not.toBeInTheDocument();
    expect(screen.getByTestId('field-first_name')).toHaveValue('Ada');
    expect(screen.getByTestId('field-last_name')).toHaveValue('Lovelace');
    expect(screen.getByTestId('field-bio')).toHaveValue('Builds engines.');
    expect(screen.getAllByRole('textbox', { name: 'Label' }).map((el) => (el as HTMLInputElement).value)).toEqual([
      'Site',
      'LinkedIn',
    ]);

    await u.clear(screen.getByTestId('field-first_name'));
    await u.type(screen.getByTestId('field-first_name'), 'Augusta');
    await u.click(screen.getByTestId('account-edit-submit'));

    await waitFor(() =>
      expect(saveProfile).toHaveBeenCalledWith({
        variables: {
          input: {
            first_name: 'Augusta',
            last_name: 'Lovelace',
            bio: 'Builds engines.',
            profile_photo: null,
            profile_links: DETAILS.profile_links,
          },
        },
      }),
    );
    expect(await screen.findByTestId('profile-saved')).toHaveTextContent('Profile updated.');
    expect(userCtx.refetch).toHaveBeenCalledTimes(1);
    expect(detailsRefetch).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('profile-details-form')).not.toBeInTheDocument();

    // The confirmation can be dismissed…
    await u.click(within(screen.getByTestId('profile-saved')).getByRole('button', { name: /close/i }));
    expect(screen.queryByTestId('profile-saved')).not.toBeInTheDocument();
  });

  it('clears the previous confirmation when editing starts again', async () => {
    const u = userEvent.setup();
    render(<DetailsTab roles={[]} />);

    await u.click(screen.getByTestId('account-edit'));
    await u.type(screen.getByTestId('field-bio'), 'Hello');
    await u.click(screen.getByTestId('account-edit-submit'));
    expect(await screen.findByTestId('profile-saved')).toBeInTheDocument();

    await u.click(screen.getByTestId('account-edit'));
    expect(screen.queryByTestId('profile-saved')).not.toBeInTheDocument();
    expect(screen.getByTestId('profile-details-form')).toBeInTheDocument();
  });

  it('keeps the form open with the server message when the save fails', async () => {
    const u = userEvent.setup();
    saveProfile.mockRejectedValue(new Error('That name is not allowed'));
    render(<DetailsTab roles={[]} />);

    await u.click(screen.getByTestId('account-edit'));
    await u.click(screen.getByTestId('account-edit-submit'));

    expect(await screen.findByTestId('account-edit-error')).toHaveTextContent('That name is not allowed');
    expect(screen.getByTestId('profile-details-form')).toBeInTheDocument();
    expect(userCtx.refetch).not.toHaveBeenCalled();
    expect(detailsRefetch).not.toHaveBeenCalled();
    expect(screen.queryByTestId('profile-saved')).not.toBeInTheDocument();
  });

  it('cancels back to the read view without saving', async () => {
    const u = userEvent.setup();
    render(<DetailsTab roles={[]} />);

    await u.click(screen.getByTestId('account-edit'));
    await u.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByTestId('profile-details-form')).not.toBeInTheDocument();
    expect(screen.getByTestId('account-edit')).toBeInTheDocument();
    expect(saveProfile).not.toHaveBeenCalled();
  });
});
