import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { fireEvent, screen } from '@testing-library/react-native';

import { AccountProfileHeader } from '@/components/account/AccountProfileHeader';
import { AuthScaffold } from '@/components/AuthScaffold';
import { BottomNav } from '@/components/BottomNav';
import { SurveyChip } from '@/components/survey/SurveyChip';
import { TAB_CONFIG } from '@/navigation/tabs';
import { renderWithProviders } from '@/utils/test-utils';

describe('AccountProfileHeader with a photo', () => {
  it('renders the avatar image when a profile photo is set', () => {
    renderWithProviders(
      <AccountProfileHeader
        me={
          {
            first_name: 'Riya',
            full_name: 'Riya Sharma',
            bio: 'Hi',
            roles: [],
            status: 'ACTIVE',
            profile_photo: 'https://img/a.jpg',
          } as never
        }
        savingPhoto={false}
        onChangePhoto={jest.fn()}
        onEdit={jest.fn()}
        onLogout={jest.fn()}
      />,
    );
    expect(screen.getByText('Riya Sharma')).toBeOnTheScreen();
  });
});

describe('AuthScaffold without an accent word', () => {
  it('omits the accent word when none is given', () => {
    renderWithProviders(
      <AuthScaffold testID="scaffold" title="Welcome" subtitle="Sub">
        <></>
      </AuthScaffold>,
    );
    expect(screen.getByText('Welcome')).toBeOnTheScreen();
  });
});

describe('SurveyChip with an emoji', () => {
  it('renders the emoji glyph for a short non-ASCII icon', () => {
    renderWithProviders(
      <SurveyChip id="c1" label="Music" icon="🎵" selected onToggle={jest.fn()} />,
    );
    expect(screen.getByText('🎵')).toBeOnTheScreen();
  });
});

describe('BottomNav focused tab press', () => {
  it('does not navigate when the focused tab is pressed', () => {
    const navigate = jest.fn();
    const props = {
      state: { index: 0, routes: [{ key: 'k', name: TAB_CONFIG[0]!.name }] },
      navigation: { emit: () => ({ defaultPrevented: false }), navigate },
      descriptors: {},
    } as unknown as BottomTabBarProps;
    renderWithProviders(<BottomNav {...props} />);
    fireEvent.press(screen.getByTestId(`tab-bar-${TAB_CONFIG[0]!.name}`));
    expect(navigate).not.toHaveBeenCalled();
  });
});
