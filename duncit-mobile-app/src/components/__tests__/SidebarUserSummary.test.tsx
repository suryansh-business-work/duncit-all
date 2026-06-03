import { fireEvent, screen } from '@testing-library/react-native';

import { SidebarUserSummary } from '@/components/Sidebar/SidebarUserSummary';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useMe', () => ({ useRoleLabels: () => ({ labelFor: (k: string) => k }) }));

describe('SidebarUserSummary', () => {
  it('renders the photo and role chips, and is tappable', () => {
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
    expect(screen.getByText('HOST')).toBeOnTheScreen();
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
