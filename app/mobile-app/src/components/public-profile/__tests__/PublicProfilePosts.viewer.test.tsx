import { fireEvent, screen } from '@testing-library/react-native';

import { PublicProfilePosts } from '@/components/public-profile/PublicProfilePosts';
import type { PublicProfilePost } from '@/hooks/usePublicProfile';
import { renderWithProviders } from '@/utils/test-utils';

// The viewer has its own spec; here it only reports which post it opened and
// hands back the two ways it ends — closed, or the post deleted.
jest.mock('@/components/profile/post-viewer/PostViewerSheet', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text, View } = require('react-native');
  return {
    PostViewerSheet: (p: {
      postId: string;
      meId?: string;
      onClose: () => void;
      onDeleted: () => void;
    }) => (
      <View testID="post-viewer">
        <Text testID="post-viewer-id">{`${p.postId}:${p.meId ?? 'guest'}`}</Text>
        <Text testID="post-viewer-close" onPress={p.onClose}>
          close
        </Text>
        <Text testID="post-viewer-delete" onPress={p.onDeleted}>
          delete
        </Text>
      </View>
    ),
  };
});

const POSTS = [
  { id: 'post-1', image_url: 'https://cdn/1.jpg' },
  { id: 'post-2', image_url: 'https://cdn/2.jpg' },
] as unknown as PublicProfilePost[];

const renderPosts = (onPostsChanged?: () => void) =>
  renderWithProviders(
    <PublicProfilePosts
      posts={POSTS}
      stories={[]}
      canView
      authorId="u1"
      authorName="Riya"
      isHost={false}
      isOwner
      meId="u1"
      onPostsChanged={onPostsChanged}
    />,
  );

describe('PublicProfilePosts post viewer', () => {
  it('opens the tapped post and closes it again without reloading the grid', () => {
    const onPostsChanged = jest.fn();
    renderPosts(onPostsChanged);
    expect(screen.queryByTestId('post-viewer')).toBeNull();

    fireEvent.press(screen.getByTestId('public-profile-post-1'));
    expect(screen.getByTestId('post-viewer-id')).toHaveTextContent('post-2:u1');

    fireEvent.press(screen.getByTestId('post-viewer-close'));
    expect(screen.queryByTestId('post-viewer')).toBeNull();
    expect(onPostsChanged).not.toHaveBeenCalled();
  });

  it('closes the viewer and asks for a reload once the post is deleted', () => {
    const onPostsChanged = jest.fn();
    renderPosts(onPostsChanged);

    fireEvent.press(screen.getByTestId('public-profile-post-0'));
    fireEvent.press(screen.getByTestId('post-viewer-delete'));

    expect(screen.queryByTestId('post-viewer')).toBeNull();
    expect(onPostsChanged).toHaveBeenCalledTimes(1);
  });

  it('still closes the viewer after a delete when nobody listens for it', () => {
    renderPosts();

    fireEvent.press(screen.getByTestId('public-profile-post-0'));
    fireEvent.press(screen.getByTestId('post-viewer-delete'));

    expect(screen.queryByTestId('post-viewer')).toBeNull();
  });
});
