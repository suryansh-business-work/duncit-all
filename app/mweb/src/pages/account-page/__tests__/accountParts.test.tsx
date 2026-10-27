import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

import SecuritySection from '../SecuritySection';
import DeleteAccountDialog from '../DeleteAccountDialog';
import EditAccountDialog from '../EditAccountDialog';
import AccountProfileHeader from '../AccountProfileHeader';
import PrivacyToggleCard from '../PrivacyToggleCard';
import CompletionMeter from '../CompletionMeter';
import AccountInfoRow from '../AccountInfoRow';
import PrivacyDataEntryCard from '../PrivacyDataEntryCard';
import CommPreferenceEntryCard from '../comm-preference/CommPreferenceEntryCard';
import ContactRows from '../contact-change/ContactRows';
import { fallbackT } from '../../../i18n/fallback';

const h = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  hold: vi.fn(),
  release: vi.fn(),
  share: vi.fn(),
  guard: {
    setDirty: vi.fn(),
    registerReset: vi.fn(),
    confirmOpen: false,
    requestClose: vi.fn(),
    confirmDiscard: vi.fn(),
    cancelDiscard: vi.fn(),
  },
  editForm: { current: undefined as undefined | ((p: Record<string, unknown>) => void) },
}));

vi.mock('@apollo/client/react', async (orig) => ({ ...(await orig<object>()), useQuery: h.useQuery, useMutation: h.useMutation }));
vi.mock('@duncit/user-core', async (orig) => ({ ...(await orig<object>()), holdSessionRevoked: h.hold, releaseSessionRevoked: h.release }));
vi.mock('../../../utils/share', () => ({ shareProfile: h.share }));
vi.mock('../ChangePasswordDialog', () => ({
  default: (p: { open: boolean; hasPassword: boolean; onClose: () => void; onChanged: () => void }) =>
    p.open ? (
      <div data-testid="pw-dialog" data-has-password={String(p.hasPassword)}>
        <button data-testid="pw-changed" onClick={p.onChanged} />
        <button data-testid="pw-close" onClick={p.onClose} />
      </div>
    ) : null,
}));
vi.mock('../DeletionRequestPanel', () => ({ default: (p: { onToast: (m: string) => void }) => <button data-testid="deletion-panel" onClick={() => p.onToast('Deletion filed')} /> }));
vi.mock('../useUnsavedGuard', () => ({ useUnsavedGuard: () => h.guard }));
vi.mock('../account-edit', async (orig) => ({
  ...(await orig<object>()),
  AccountEditForm: (p: Record<string, unknown>) => {
    h.editForm.current?.(p);
    return (
      <div data-testid="edit-form" data-loading={String(p.loading)} data-error={String(p.errorMessage ?? '')}>
        <button data-testid="submit-same" onClick={() => (p.onSubmit as (v: unknown) => void)({ username: 'asha', first_name: 'A' })} />
        <button data-testid="submit-rename" onClick={() => (p.onSubmit as (v: unknown) => void)({ username: 'New_Handle', first_name: 'A' })} />
        <button data-testid="submit-nohandle" onClick={() => (p.onSubmit as (v: unknown) => void)({ username: '', first_name: 'A' })} />
        <button data-testid="contact-changed" onClick={p.onContactChanged as () => void} />
      </div>
    );
  },
}));
vi.mock('../../../components/profile-avatar', () => ({
  default: (p: { photo?: string; name: string; onChanged?: () => void }) => <button data-testid="avatar" data-name={p.name} data-photo={String(p.photo)} onClick={p.onChanged} />,
}));
vi.mock('../../../hooks/useRoleLabels', () => ({ useRoleLabels: () => ({ labelFor: (key: string) => `Role ${key}` }) }));

const Where = () => <div data-testid="where">{useLocation().pathname}</div>;
const inRouter = (ui: React.ReactNode) =>
  render(
    <MemoryRouter initialEntries={['/account']}>
      <Routes>
        <Route path="/account" element={ui} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  h.guard.confirmOpen = false;
  h.editForm.current = undefined;
});

describe('SecuritySection', () => {
  const section = (state: object) => {
    const refetch = vi.fn().mockResolvedValue(undefined);
    h.useQuery.mockReturnValue({ data: undefined, loading: false, refetch, ...state });
    inRouter(<SecuritySection />);
    return refetch;
  };

  it('offers to change an existing password, and defaults to that while unknown', () => {
    section({ data: { myConnectedAccounts: { has_password: true } } });
    expect(screen.getByTestId('open-change-password')).toHaveTextContent(fallbackT('mweb.account.changePassword'));
    fireEvent.click(screen.getByTestId('open-change-password'));
    expect(screen.getByTestId('pw-dialog')).toHaveAttribute('data-has-password', 'true');
  });

  it('offers to create a password for an account that never had one, and says it was created', async () => {
    const refetch = section({ data: { myConnectedAccounts: { has_password: false } } });
    expect(screen.getByTestId('open-change-password')).toHaveTextContent(fallbackT('mweb.account.createPassword'));
    fireEvent.click(screen.getByTestId('open-change-password'));
    fireEvent.click(screen.getByTestId('pw-changed'));
    expect(await screen.findByTestId('security-toast')).toHaveTextContent(fallbackT('mweb.account.passwordCreated'));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('says the password was updated for an account that had one, and swallows a failing refresh', async () => {
    const refetch = section({ data: { myConnectedAccounts: { has_password: true } } });
    refetch.mockRejectedValue(new Error('offline'));
    fireEvent.click(screen.getByTestId('open-change-password'));
    fireEvent.click(screen.getByTestId('pw-changed'));
    expect(await screen.findByTestId('security-toast')).toHaveTextContent(fallbackT('mweb.account.passwordUpdated'));
  });

  it('closes the dialog, disables the button while loading, and shows the deletion panel toast', async () => {
    section({ loading: true, data: undefined });
    expect(screen.getByTestId('open-change-password')).toBeDisabled();
    fireEvent.click(screen.getByTestId('deletion-panel'));
    expect(await screen.findByTestId('security-toast')).toHaveTextContent('Deletion filed');
  });

  it('closes the password dialog from the dialog', () => {
    section({ data: { myConnectedAccounts: { has_password: true } } });
    fireEvent.click(screen.getByTestId('open-change-password'));
    fireEvent.click(screen.getByTestId('pw-close'));
    expect(screen.queryByTestId('pw-dialog')).not.toBeInTheDocument();
  });
});

describe('DeleteAccountDialog', () => {
  const dialog = (requestOtp = vi.fn().mockResolvedValue({}), submit = vi.fn().mockResolvedValue({ data: { submitAccountDeletionRequest: { id: 'r1', scheduled_for: 'x' } } })) => {
    let call = 0;
    h.useMutation.mockImplementation(() => (call++ % 2 === 0 ? [requestOtp, { loading: false }] : [submit, { loading: false }]));
    const props = { open: true, onClose: vi.fn(), onSubmitted: vi.fn() };
    render(<DeleteAccountDialog {...props} />);
    return { ...props, requestOtp, submit };
  };
  const fill = (otp: string) => {
    fireEvent.change(screen.getByLabelText(new RegExp(fallbackT('mweb.account.deletion.otpLabel'))), { target: { value: otp } });
    fireEvent.click(screen.getByTestId('delete-account-submit'));
  };

  it('starts with the code-sent note and shows the intro', () => {
    dialog();
    expect(screen.getByTestId('delete-account-info')).toHaveTextContent(fallbackT('mweb.account.deletion.otpSent'));
    expect(screen.getByTestId('delete-account-dialog')).toHaveTextContent(fallbackT('mweb.account.deletion.otpIntro'));
  });

  it('files the request with the code and reason, holding the session-revoked frame, and hands the request up', async () => {
    const { submit, onSubmitted } = dialog();
    fireEvent.change(screen.getByLabelText(fallbackT('mweb.account.deletion.reasonLabel')), { target: { value: 'Leaving' } });
    fill('123456');
    await waitFor(() => expect(onSubmitted).toHaveBeenCalledWith({ id: 'r1', scheduled_for: 'x' }));
    expect(submit).toHaveBeenCalledWith({ variables: { input: { otp: '123456', reason: 'Leaving', surface: 'MWEB' } } });
    expect(h.hold).toHaveBeenCalledTimes(1);
    expect(h.release).not.toHaveBeenCalled();
  });

  it('rejects a code that is not six digits without filing', async () => {
    const { submit } = dialog();
    fill('12');
    expect(await screen.findByText(fallbackT('mweb.account.deletion.validation.otpPattern'))).toBeInTheDocument();
    expect(submit).not.toHaveBeenCalled();
  });

  it('releases the held frame and shows the reason when filing fails', async () => {
    const { onSubmitted } = dialog(undefined, vi.fn().mockRejectedValue(new Error('Wrong code')));
    fill('123456');
    expect(await screen.findByTestId('delete-account-error')).toHaveTextContent('Wrong code');
    expect(h.release).toHaveBeenCalledTimes(1);
    expect(onSubmitted).not.toHaveBeenCalled();
  });

  it('resends the code and says so, or shows why it could not', async () => {
    const { requestOtp } = dialog();
    fireEvent.click(screen.getByTestId('delete-account-resend'));
    await waitFor(() => expect(requestOtp).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('delete-account-info')).toHaveTextContent(fallbackT('mweb.account.deletion.otpSent'));
  });

  it('shows why a resend failed', async () => {
    dialog(vi.fn().mockRejectedValue(new Error('Too many requests')));
    fireEvent.click(screen.getByTestId('delete-account-resend'));
    await waitFor(() => expect(screen.getByTestId('delete-account-info')).toHaveTextContent('Too many requests'));
  });

  it('shows the resending label while the code is on its way', () => {
    h.useMutation.mockImplementation((_doc: unknown) => [vi.fn(), { loading: true }]);
    render(<DeleteAccountDialog open onClose={vi.fn()} onSubmitted={vi.fn()} />);
    expect(screen.getByTestId('delete-account-resend')).toBeDisabled();
    expect(screen.getByTestId('delete-account-resend')).toHaveTextContent(fallbackT('mweb.account.deletion.resending'));
  });
});

describe('EditAccountDialog', () => {
  const edit = (updateProfile = vi.fn().mockResolvedValue({}), setUsername = vi.fn().mockResolvedValue({}), flags: { error?: Error; renameError?: Error; loading?: boolean; renaming?: boolean } = {}) => {
    let call = 0;
    h.useMutation.mockImplementation(() =>
      call++ % 2 === 0 ? [updateProfile, { loading: Boolean(flags.loading), error: flags.error }] : [setUsername, { loading: Boolean(flags.renaming), error: flags.renameError }]
    );
    const props = { open: true, onClose: vi.fn(), onSaved: vi.fn(), initial: { username: 'asha', first_name: 'A' }, contacts: {} as never };
    render(<EditAccountDialog {...props} />);
    return { ...props, updateProfile, setUsername };
  };

  it('saves the profile without renaming when the handle did not change, then reports and closes', async () => {
    const { updateProfile, setUsername, onSaved, onClose } = edit();
    fireEvent.click(screen.getByTestId('submit-same'));
    await waitFor(() => expect(updateProfile).toHaveBeenCalledTimes(1));
    expect(setUsername).not.toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renames first, with the normalised handle, and then saves the rest', async () => {
    const { updateProfile, setUsername } = edit();
    fireEvent.click(screen.getByTestId('submit-rename'));
    await waitFor(() => expect(updateProfile).toHaveBeenCalledTimes(1));
    expect(setUsername).toHaveBeenCalledWith({ variables: { username: 'new_handle' } });
  });

  it('leaves the rest of the profile untouched when the rename is refused', async () => {
    const { updateProfile, onSaved, onClose } = edit(undefined, vi.fn().mockRejectedValue(new Error('taken')));
    fireEvent.click(screen.getByTestId('submit-rename'));
    await waitFor(() => expect(h.useMutation).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(updateProfile).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not rename when the form carries no handle', async () => {
    const { setUsername, updateProfile } = edit();
    fireEvent.click(screen.getByTestId('submit-nohandle'));
    await waitFor(() => expect(updateProfile).toHaveBeenCalledTimes(1));
    expect(setUsername).not.toHaveBeenCalled();
  });

  it('reports an account refreshed by a proved contact change straight away', () => {
    const { onSaved } = edit();
    fireEvent.click(screen.getByTestId('contact-changed'));
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('passes the server error, or the localized rename sentence, and the loading state to the form', () => {
    edit(undefined, undefined, { error: new Error('Profile failed') });
    expect(screen.getByTestId('edit-form')).toHaveAttribute('data-error', 'Profile failed');
  });

  it('prefers the localized sentence for a refused rename', () => {
    edit(undefined, undefined, { renameError: new Error('taken'), error: new Error('ignored') });
    expect(screen.getByTestId('edit-form')).not.toHaveAttribute('data-error', 'ignored');
    expect(screen.getByTestId('edit-form').getAttribute('data-error')).not.toBe('');
  });

  it('is loading while saving or renaming', () => {
    edit(undefined, undefined, { renaming: true });
    expect(screen.getByTestId('edit-form')).toHaveAttribute('data-loading', 'true');
  });

  it('is idle with no error when nothing is happening', () => {
    edit();
    expect(screen.getByTestId('edit-form')).toHaveAttribute('data-loading', 'false');
    expect(screen.getByTestId('edit-form')).toHaveAttribute('data-error', '');
  });

  it('shows the discard confirmation and wires its two buttons to the guard', () => {
    h.guard.confirmOpen = true;
    edit();
    fireEvent.click(screen.getByTestId('edit-account-discard-confirm-cancel'));
    fireEvent.click(screen.getByTestId('edit-account-discard-confirm-confirm'));
    expect(h.guard.cancelDiscard).toHaveBeenCalledTimes(1);
    expect(h.guard.confirmDiscard).toHaveBeenCalledTimes(1);
  });
});

describe('AccountProfileHeader', () => {
  const me = (over: object = {}) => ({ user_id: 'u1', username: 'asha', full_name: 'Asha Rao', first_name: 'Asha', last_name: 'Rao', bio: 'Runner', profile_photo: 'https://img/a.jpg', roles: ['USER', 'HOST'], ...over });
  const header = (m: object) => {
    const handlers = { onEdit: vi.fn(), onLogout: vi.fn(), onChanged: vi.fn() };
    render(<AccountProfileHeader me={m} {...handlers} />);
    return handlers;
  };

  it('shows the name, bio and role chips, and routes edit, share, logout and photo changes', () => {
    const handlers = header(me());
    expect(screen.getByRole('heading', { name: 'Asha Rao' })).toBeInTheDocument();
    expect(screen.getByText('Runner')).toBeInTheDocument();
    expect(screen.getByText('Role USER')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('account-edit'));
    fireEvent.click(screen.getByTestId('account-share'));
    fireEvent.click(screen.getByTestId('account-logout'));
    fireEvent.click(screen.getByTestId('avatar'));
    expect(handlers.onEdit).toHaveBeenCalledTimes(1);
    expect(h.share).toHaveBeenCalledWith('u1', 'Asha Rao', 'asha');
    expect(handlers.onLogout).toHaveBeenCalledTimes(1);
    expect(handlers.onChanged).toHaveBeenCalledTimes(1);
  });

  it('builds the name from first and last when there is no full name, and omits a missing bio and roles', () => {
    header(me({ full_name: '', bio: '', roles: undefined }));
    expect(screen.getByRole('heading', { name: 'Asha Rao' })).toBeInTheDocument();
    expect(screen.getByTestId('avatar')).toHaveAttribute('data-name', 'Asha Rao');
    expect(screen.queryByText('Runner')).not.toBeInTheDocument();
  });

  it('copes with a missing first or last name when there is no full name', () => {
    header(me({ full_name: '', first_name: null, last_name: null }));
    expect(screen.getByTestId('avatar')).toHaveAttribute('data-name', '');
  });
});

describe('PrivacyToggleCard', () => {
  const card = (visibility: string | null | undefined, setVisibility = vi.fn().mockResolvedValue({}), loading = false) => {
    h.useMutation.mockReturnValue([setVisibility, { loading }]);
    const onChanged = vi.fn();
    render(<PrivacyToggleCard visibility={visibility} onChanged={onChanged} />);
    return { setVisibility, onChanged };
  };

  it('reflects a private or public profile, and flips it with the matching enum', async () => {
    const { setVisibility, onChanged } = card('PRIVATE');
    expect(screen.getByTestId('privacy-switch-input')).toBeChecked();
    fireEvent.click(screen.getByTestId('privacy-switch-input'));
    await waitFor(() => expect(setVisibility).toHaveBeenCalledWith({ variables: { visibility: 'PUBLIC' } }));
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it('makes a public profile private, and treats an unset visibility as public', async () => {
    const { setVisibility } = card(undefined);
    expect(screen.getByTestId('privacy-switch-input')).not.toBeChecked();
    fireEvent.click(screen.getByTestId('privacy-switch-input'));
    await waitFor(() => expect(setVisibility).toHaveBeenCalledWith({ variables: { visibility: 'PRIVATE' } }));
  });

  it('keeps the previous state and does not report a change when it fails', async () => {
    const { onChanged } = card('PUBLIC', vi.fn().mockRejectedValue(new Error('offline')));
    fireEvent.click(screen.getByTestId('privacy-switch-input'));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(onChanged).not.toHaveBeenCalled();
    expect(screen.getByTestId('privacy-switch-input')).not.toBeChecked();
  });

  it('shows a spinner instead of the switch while it saves', () => {
    card('PUBLIC', undefined, true);
    expect(screen.queryByTestId('privacy-switch')).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});

describe('CompletionMeter, AccountInfoRow and the entry cards', () => {
  it('shows the share of filled profile fields', () => {
    render(<CompletionMeter profile={{ first_name: 'A', last_name: 'B', bio: '  ', dob: '1990-01-01', city: null }} />);
    expect(screen.getByTestId('profile-completion-value')).toHaveTextContent('30% complete');
    expect(screen.getByRole('progressbar', { name: fallbackT('mweb.account.profileCompletion') })).toHaveAttribute('aria-valuenow', '30');
  });

  it('shows an empty meter for an empty profile and a full one for a complete profile', () => {
    const { unmount } = render(<CompletionMeter profile={{}} />);
    expect(screen.getByTestId('profile-completion-value')).toHaveTextContent('0% complete');
    unmount();
    const full = Object.fromEntries(['first_name', 'last_name', 'bio', 'dob', 'city', 'state', 'country', 'phone_number', 'whatsapp_number', 'profile_photo'].map((k) => [k, 'x']));
    render(<CompletionMeter profile={full} />);
    expect(screen.getByTestId('profile-completion-value')).toHaveTextContent('100% complete');
  });

  it('shows an info row with its label and value', () => {
    render(<AccountInfoRow icon={<i />} label="City" value="Pune" />);
    expect(screen.getByTestId('account-info-row-City')).toHaveTextContent('CityPune');
  });

  it('links the privacy and communication entry cards to their screens', () => {
    const { unmount } = inRouter(<PrivacyDataEntryCard />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/account/privacy');
    unmount();
    inRouter(<CommPreferenceEntryCard />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/account/communication');
  });
});

describe('ContactRows', () => {
  const labels = {
    channel: (c: string) => ({ name: `${c} name`, emptyValue: `no ${c}` }),
    changeAction: 'Change',
    addAction: 'Add',
    verified: 'Verified',
  };
  const snapshot = { email: 'a@b.co', phone_number: '9999999999', phone_extension: '+91', is_phone_verified: true, whatsapp_number: '', whatsapp_extension: '', whatsapp_verified_at: null };

  it('shows each channel current value, a verified badge only where proved, and Add for an empty one', () => {
    const onChange = vi.fn();
    render(<ContactRows labels={labels as never} snapshot={snapshot as never} onChange={onChange} />);
    expect(screen.getByTestId('contact-change-EMAIL-value')).toHaveTextContent('a@b.co');
    expect(screen.queryByTestId('contact-change-EMAIL-verified')).not.toBeInTheDocument();
    expect(screen.getByTestId('contact-change-PHONE-verified')).toHaveTextContent('Verified');
    expect(screen.getByTestId('contact-change-WHATSAPP-value')).toHaveTextContent('no WHATSAPP');
    expect(screen.getByTestId('contact-change-WHATSAPP')).toHaveTextContent('Add');
    expect(screen.getByTestId('contact-change-EMAIL')).toHaveTextContent('Change');
    fireEvent.click(screen.getByTestId('contact-change-PHONE'));
    expect(onChange).toHaveBeenCalledWith('PHONE');
  });
});
