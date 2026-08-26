import { act, fireEvent, screen } from '@testing-library/react-native';

import { DetailHero } from '@/components/details/DetailHero';
import { FollowPillButton } from '@/components/FollowPillButton';
import { ImageViewerModal } from '@/components/ImageViewerModal';
import { PrivacyToggleCard } from '@/components/account/PrivacyToggleCard';
import { PublicProfilePosts } from '@/components/public-profile/PublicProfilePosts';
import { renderWithProviders } from '@/utils/test-utils';

describe('FollowPillButton', () => {
  it('presses when idle and shows the Follow label', () => {
    const onToggle = jest.fn();
    renderWithProviders(
      <FollowPillButton testID="pill" following={false} busy={false} onToggle={onToggle} />,
    );
    expect(screen.getByText('Follow')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('pill'));
    expect(onToggle).toHaveBeenCalled();
  });

  it('is inert while busy and shows the Following label', () => {
    const onToggle = jest.fn();
    renderWithProviders(<FollowPillButton testID="pill" following busy onToggle={onToggle} />);
    expect(screen.getByText('Following')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('pill'));
    expect(onToggle).not.toHaveBeenCalled();
  });
});

describe('ImageViewerModal', () => {
  it('renders the gallery and closes', () => {
    const onClose = jest.fn();
    renderWithProviders(
      <ImageViewerModal images={['a.jpg', 'b.jpg']} index={1} onClose={onClose} />,
    );
    expect(screen.getByTestId('image-viewer')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('image-viewer-close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('stays closed when no index is set', () => {
    renderWithProviders(<ImageViewerModal images={['a.jpg']} index={null} onClose={jest.fn()} />);
    expect(screen.queryByTestId('image-viewer')).toBeNull();
  });
});

describe('PrivacyToggleCard', () => {
  it('calls onChange and guards against re-entry while saving', async () => {
    let release!: () => void;
    const onChange = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    renderWithProviders(<PrivacyToggleCard isPrivate={false} onChange={onChange} />);
    const sw = screen.getByTestId('privacy-switch');
    await act(async () => {
      fireEvent(sw, 'valueChange', true);
    });
    fireEvent(sw, 'valueChange', true); // ignored while busy
    expect(onChange).toHaveBeenCalledTimes(1);
    await act(async () => {
      release();
    });
  });
});

describe('PublicProfilePosts', () => {
  it('shows a lock card for a private account', () => {
    renderWithProviders(
      <PublicProfilePosts
        posts={[]}
        stories={[]}
        canView={false}
        authorId="u1"
        authorName="Riya"
      />,
    );
    expect(screen.getByTestId('public-profile-private')).toBeOnTheScreen();
  });

  it('shows the empty state with no posts', () => {
    renderWithProviders(
      <PublicProfilePosts posts={[]} stories={[]} canView authorId="u1" authorName="Riya" />,
    );
    expect(screen.getByTestId('public-profile-no-posts')).toBeOnTheScreen();
  });

  it('opens a post and a story in the viewer', () => {
    renderWithProviders(
      <PublicProfilePosts
        posts={[
          { id: '1', image_url: 'a.jpg', caption: 'x' },
          { id: '2', image_url: 'b.jpg', caption: '' },
        ]}
        stories={[
          {
            id: 's1',
            image_url: 's1.jpg',
            media_type: 'IMAGE',
            caption: '',
            created_at: '2026-06-09T10:00:00.000Z',
            expires_at: '2026-06-10T10:00:00.000Z',
            seen_by_me: false,
          },
        ]}
        canView
        authorId="u1"
        authorName="Riya"
      />,
    );
    fireEvent.press(screen.getByTestId('public-profile-post-0'));
    fireEvent.press(screen.getByTestId('image-viewer-close'));
    // A story opens the timed story viewer, not the plain image viewer.
    fireEvent.press(screen.getByTestId('public-profile-story-0'));
    expect(screen.getByTestId('status-viewer')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('status-viewer-close'));
  });
});

describe('DetailHero', () => {
  it('opens the fullscreen viewer on image tap and closes it', () => {
    renderWithProviders(
      <DetailHero
        media={[
          { url: 'a.jpg', type: 'IMAGE' },
          { url: 'b.jpg', type: 'IMAGE' },
        ]}
        onBack={jest.fn()}
      />,
    );
    fireEvent.press(screen.getByTestId('detail-hero-image-0'));
    fireEvent.press(screen.getByTestId('image-viewer-close'));
    expect(screen.getByTestId('detail-back')).toBeOnTheScreen();
  });

  it('renders the placeholder when there are no images', () => {
    renderWithProviders(<DetailHero media={[]} onBack={jest.fn()} />);
    expect(screen.getByTestId('detail-back')).toBeOnTheScreen();
  });
});
