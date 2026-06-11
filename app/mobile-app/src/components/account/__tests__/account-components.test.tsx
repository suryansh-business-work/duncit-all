import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import {
  AccountHealthCard,
  AccountInfoRow,
  AccountProfileHeader,
  EditAccountDialog,
  HostsVenuesCard,
} from '@/components/account';
import type { AccountHealth, AccountMe } from '@/hooks/useAccount';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useMe', () => ({
  useRoleLabels: () => ({ labelFor: (k: string) => `Role:${k}` }),
}));

const me = {
  user_id: 'u1',
  first_name: 'Riya',
  last_name: 'Sharma',
  full_name: 'Riya Sharma',
  email: 'riya@duncit.com',
  phone_number: '9876543210',
  phone_extension: '+91',
  whatsapp_number: '',
  whatsapp_extension: '+91',
  profile_photo: null,
  bio: 'Hello there',
  city: 'Pune',
  zone: 'Kothrud',
  country: 'India',
  dob: '1995-01-01',
  roles: ['USER'],
  status: 'ACTIVE',
  created_at: '2024-01-01',
} as unknown as AccountMe;

describe('AccountInfoRow', () => {
  it('renders label and value', () => {
    renderWithProviders(<AccountInfoRow icon="email" label="Email" value="x@y.com" />);
    expect(screen.getByText('Email')).toBeOnTheScreen();
    expect(screen.getByText('x@y.com')).toBeOnTheScreen();
  });
});

describe('AccountProfileHeader', () => {
  it('renders identity + role/status chips and fires edit/logout/photo', () => {
    const onChangePhoto = jest.fn();
    const onEdit = jest.fn();
    const onLogout = jest.fn();
    renderWithProviders(
      <AccountProfileHeader
        me={me}
        savingPhoto={false}
        onChangePhoto={onChangePhoto}
        onEdit={onEdit}
        onLogout={onLogout}
      />,
    );
    expect(screen.getByText('Riya Sharma')).toBeOnTheScreen();
    expect(screen.getByText('Role:USER')).toBeOnTheScreen();
    expect(screen.getByText('ACTIVE')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('account-change-photo'));
    fireEvent.press(screen.getByTestId('account-edit'));
    fireEvent.press(screen.getByTestId('account-logout'));
    expect(onChangePhoto).toHaveBeenCalled();
    expect(onEdit).toHaveBeenCalled();
    expect(onLogout).toHaveBeenCalled();
  });

  it('disables the photo button and uses initials when saving / no photo + name fallback', () => {
    const onChangePhoto = jest.fn();
    renderWithProviders(
      <AccountProfileHeader
        me={{ ...me, full_name: null, bio: null } as AccountMe}
        savingPhoto
        onChangePhoto={onChangePhoto}
        onEdit={jest.fn()}
        onLogout={jest.fn()}
      />,
    );
    fireEvent.press(screen.getByTestId('account-change-photo'));
    expect(onChangePhoto).not.toHaveBeenCalled();
    expect(screen.getByText('Riya Sharma')).toBeOnTheScreen();
  });
});

describe('AccountHealthCard', () => {
  const health = (over: Record<string, unknown> = {}): AccountHealth =>
    ({
      base_score: 100,
      delta_sum: 0,
      total_score: 100,
      band: 'GREEN',
      adjustments: [],
      ...over,
    }) as unknown as AccountHealth;

  it('renders the green band message', () => {
    renderWithProviders(<AccountHealthCard health={health()} />);
    expect(screen.getByText('You’re in great shape.')).toBeOnTheScreen();
  });

  it('renders yellow band, admin adjustment and remark count', () => {
    renderWithProviders(
      <AccountHealthCard
        health={health({
          band: 'YELLOW',
          delta_sum: -10,
          total_score: 90,
          adjustments: [{ id: 'a' }] as never,
        })}
      />,
    );
    expect(screen.getByText('A few things to tighten up.')).toBeOnTheScreen();
    expect(screen.getByText(/Admin adjustment: -10/)).toBeOnTheScreen();
    expect(screen.getByText('1 admin remark.')).toBeOnTheScreen();
  });

  it('renders red band with a positive adjustment', () => {
    renderWithProviders(
      <AccountHealthCard health={health({ band: 'RED', delta_sum: 5, total_score: 105 })} />,
    );
    expect(screen.getByText('Needs attention.')).toBeOnTheScreen();
    expect(screen.getByText(/\+5/)).toBeOnTheScreen();
  });

  it('is tappable when onPress is provided', () => {
    const onPress = jest.fn();
    renderWithProviders(<AccountHealthCard health={health()} onPress={onPress} />);
    expect(screen.getByText('Tap for details')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('account-health'));
    expect(onPress).toHaveBeenCalled();
  });

  it('falls back to a neutral colour/message for an unknown band', () => {
    renderWithProviders(<AccountHealthCard health={health({ band: 'PURPLE' })} />);
    expect(screen.getByText('Account health')).toBeOnTheScreen();
  });

  it('pluralises the remark count', () => {
    renderWithProviders(
      <AccountHealthCard health={health({ adjustments: [{ id: 'a' }, { id: 'b' }] as never })} />,
    );
    expect(screen.getByText('2 admin remarks.')).toBeOnTheScreen();
  });
});

describe('HostsVenuesCard', () => {
  it('shows onboarding labels and fires actions', () => {
    const onHost = jest.fn();
    const onVenue = jest.fn();
    const onPodHistory = jest.fn();
    renderWithProviders(
      <HostsVenuesCard
        isHost={false}
        isVenue={false}
        onHost={onHost}
        onVenue={onVenue}
        onPodHistory={onPodHistory}
      />,
    );
    expect(screen.getByText('Become a Host')).toBeOnTheScreen();
    expect(screen.getByText('Register Venue')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('hv-host'));
    fireEvent.press(screen.getByTestId('hv-venue'));
    fireEvent.press(screen.getByTestId('hv-pod-history'));
    expect(onHost).toHaveBeenCalled();
    expect(onVenue).toHaveBeenCalled();
    expect(onPodHistory).toHaveBeenCalled();
  });

  it('shows management labels for hosts/venue owners', () => {
    renderWithProviders(
      <HostsVenuesCard
        isHost
        isVenue
        onHost={jest.fn()}
        onVenue={jest.fn()}
        onPodHistory={jest.fn()}
      />,
    );
    expect(screen.getByText('Hosts Management')).toBeOnTheScreen();
    expect(screen.getByText('Venue Management')).toBeOnTheScreen();
  });

  it('opens the discovery list when the header is tapped', () => {
    const onDiscover = jest.fn();
    renderWithProviders(
      <HostsVenuesCard
        isHost={false}
        isVenue={false}
        onDiscover={onDiscover}
        onHost={jest.fn()}
        onVenue={jest.fn()}
        onPodHistory={jest.fn()}
      />,
    );
    fireEvent.press(screen.getByTestId('account-hosts-venues-discover'));
    expect(onDiscover).toHaveBeenCalled();
  });
});

describe('EditAccountDialog', () => {
  it('is hidden when closed', () => {
    renderWithProviders(
      <EditAccountDialog open={false} me={me} onClose={jest.fn()} onSave={jest.fn()} />,
    );
    expect(screen.queryByTestId('account-edit-submit')).toBeNull();
  });

  it('saves mapped values then closes', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();
    renderWithProviders(<EditAccountDialog open me={me} onClose={onClose} onSave={onSave} />);
    fireEvent.press(screen.getByTestId('account-edit-submit'));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toMatchObject({ first_name: 'Riya', city: 'Pune' });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('shows an error when saving fails and can be dismissed', async () => {
    const onSave = jest.fn().mockRejectedValue(new Error('save failed'));
    renderWithProviders(<EditAccountDialog open me={me} onClose={jest.fn()} onSave={onSave} />);
    fireEvent.press(screen.getByTestId('account-edit-submit'));
    await waitFor(() =>
      expect(screen.getByTestId('account-edit-error')).toHaveTextContent('save failed'),
    );
    fireEvent.press(screen.getByTestId('edit-account-close'));
  });
});
