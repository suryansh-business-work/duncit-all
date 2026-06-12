import { fireEvent, screen } from '@testing-library/react-native';

import { SidebarUserSummary } from '@/components/Sidebar/SidebarUserSummary';
import { renderWithProviders } from '@/utils/test-utils';

describe('SidebarUserSummary', () => {
  it('renders the photo card without role chips, and is tappable', () => {
    const onPress = jest.fn();
    renderWithProviders(
      <SidebarUserSummary
        me={{
          full_name: 'Asha',
          email: 'a@x.com',
          profile_photo: 'https://x/p.png',
          roles: ['HOST'],
        }}
        onPress={onPress}
      />,
    );
    // Roles intentionally never render here — the studio switcher owns that.
    expect(screen.queryByText('HOST')).toBeNull();
    expect(screen.getByText('View profile')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('sidebar-user-summary'));
    expect(onPress).toHaveBeenCalled();
  });

  it('falls back to the initial and placeholders with no user', () => {
    renderWithProviders(<SidebarUserSummary me={null} onPress={jest.fn()} />);
    expect(screen.getByText('U')).toBeOnTheScreen();
    expect(screen.getByText('User')).toBeOnTheScreen();
    expect(screen.getByText('—')).toBeOnTheScreen();
  });
});
