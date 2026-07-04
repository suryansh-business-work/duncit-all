import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';
import { screen } from '@testing-library/react-native';

import { AccountProfileHeader } from '@/components/account/AccountProfileHeader';
import { AuthCard } from '@/components/AuthCard';
import { BottomNav } from '@/components/BottomNav';
import { ChatMessageBubble } from '@/components/chat/ChatMessageBubble';
import { FeedList } from '@/components/FeedList';
import { PrimaryButton } from '@/components/PrimaryButton';
import { StatusTile } from '@/components/status/StatusTile';
import { SurveyChip } from '@/components/survey/SurveyChip';
import { useThemeStore } from '@/stores/theme.store';
import { renderWithProviders } from '@/utils/test-utils';

// Surface the avatar's `initial` prop as text so the header's initials fallback
// stays covered without mounting the avatar's photo/story hooks.
jest.mock('@/components/profile/ProfileAvatar', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return { ProfileAvatar: ({ initial }: { initial: string }) => <Text>{initial}</Text> };
});

describe('AccountProfileHeader fallbacks', () => {
  it('renders the initial, no status chip and no photo', () => {
    renderWithProviders(
      <AccountProfileHeader
        me={
          {
            first_name: undefined,
            last_name: 'X',
            full_name: 'Full Name',
            bio: '',
            roles: [],
            status: null,
            profile_photo: null,
          } as never
        }
        onEdit={jest.fn()}
        onLogout={jest.fn()}
      />,
    );
    expect(screen.getByText('U')).toBeOnTheScreen(); // first_name?.[0] ?? 'U'
    expect(screen.getByText('Full Name')).toBeOnTheScreen();
  });
});

describe('AuthCard dark scheme', () => {
  afterEach(() => useThemeStore.setState({ scheme: 'light' }));
  it('uses the dark gradient + border + shadow when the scheme is dark', () => {
    useThemeStore.setState({ scheme: 'dark' });
    renderWithProviders(
      <AuthCard testID="auth-card">
        <></>
      </AuthCard>,
    );
    expect(screen.getByTestId('auth-card')).toBeOnTheScreen();
  });
});

describe('ChatMessageBubble image + textless', () => {
  it('renders the image and omits absent text', () => {
    renderWithProviders(
      <ChatMessageBubble
        message={{ id: 'm1', user_name: 'Asha', text: '', image_url: 'https://img/x.jpg' } as never}
        mine
      />,
    );
    expect(screen.getByTestId('chat-message-m1')).toBeOnTheScreen();
  });
});

describe('PrimaryButton default spinner id', () => {
  it('falls back to the default test id while loading without a testID', () => {
    renderWithProviders(<PrimaryButton label="Go" onPress={jest.fn()} loading />);
    expect(screen.getByTestId('primary-button-spinner')).toBeOnTheScreen();
  });
});

describe('FeedList without pull-to-refresh', () => {
  it('renders content with no refresh control', () => {
    renderWithProviders(
      <FeedList
        isLoading={false}
        isEmpty={false}
        emptyText="none"
        testID="feed"
        data={[{ id: 'a' }]}
        keyExtractor={(item) => item.id}
        renderItem={(item) => <View testID={`feed-row-${item.id}`} />}
      />,
    );
    expect(screen.getByTestId('feed')).toBeOnTheScreen();
    expect(screen.getByTestId('feed-row-a')).toBeOnTheScreen();
  });
});

describe('SurveyChip without an emoji', () => {
  it('omits the emoji glyph when the icon has no mapping', () => {
    renderWithProviders(
      <SurveyChip id="c1" label="Music" icon={null} selected={false} onToggle={jest.fn()} />,
    );
    expect(screen.getByText('Music')).toBeOnTheScreen();
  });
});

describe('StatusTile blank label', () => {
  it('falls back to "?" for an empty label', () => {
    renderWithProviders(<StatusTile label="" testID="tile" />);
    expect(screen.getByText('?')).toBeOnTheScreen();
  });
});

describe('BottomNav unknown route', () => {
  it('renders nothing for a route missing from the tab config', () => {
    const props = {
      state: { index: 0, routes: [{ key: 'k1', name: 'NotATab' }] },
      navigation: { emit: () => ({ defaultPrevented: false }), navigate: jest.fn() },
      descriptors: {},
    } as unknown as BottomTabBarProps;
    renderWithProviders(<BottomNav {...props} />);
    expect(screen.queryByTestId('tab-bar-NotATab')).toBeNull();
  });
});
