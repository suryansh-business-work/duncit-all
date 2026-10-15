import { fireEvent, screen } from '@testing-library/react-native';

import { PublicProfilePosts } from '@/components/public-profile/PublicProfilePosts';
import { renderWithProviders } from '@/utils/test-utils';

// The panel loads its own pods (own spec); here it reports what the tab handed it.
jest.mock('@/components/profile/ProfilePodsPanel', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return {
    ProfilePodsPanel: (p: { userId: string; kind: string; requestFromHost?: string }) => (
      <Text testID={`pods-panel-${p.kind}`}>
        {`${p.userId}:${p.requestFromHost ?? 'no-request'}`}
      </Text>
    ),
  };
});

const renderProfile = (isOwner: boolean) =>
  renderWithProviders(
    <PublicProfilePosts
      posts={[]}
      stories={[]}
      canView
      authorId="u1"
      authorName="Riya"
      isHost
      isOwner={isOwner}
    />,
  );

describe('PublicProfilePosts pod tabs', () => {
  it("lets a visitor request an event from someone else's hosted tab", () => {
    renderProfile(false);
    fireEvent.press(screen.getByTestId('profile-tab-hosted'));
    expect(screen.getByTestId('pods-panel-hosted')).toHaveTextContent('u1:Riya');
  });

  it('never offers the owner a request on their own hosted tab', () => {
    renderProfile(true);
    fireEvent.press(screen.getByTestId('profile-tab-hosted'));
    expect(screen.getByTestId('pods-panel-hosted')).toHaveTextContent('u1:no-request');
  });

  it('shows the joined pods without a request', () => {
    renderProfile(false);
    fireEvent.press(screen.getByTestId('profile-tab-joined'));
    expect(screen.getByTestId('pods-panel-joined')).toHaveTextContent('u1:no-request');
    expect(screen.queryByTestId('pods-panel-hosted')).toBeNull();
  });
});
