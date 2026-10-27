import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import type { ReactNode } from 'react';

import MyStatusUploadTile from '../MyStatusUploadTile';
import StoryViewersDialog from '../StoryViewersDialog';
import StatusOptionsMenu from '../StatusOptionsMenu';
import ClubRecommendationRow from '../ClubRecommendationRow';
import { fallbackT } from '../../../i18n/fallback';

const h = vi.hoisted(() => ({
  upload: { active: false, kind: 'profile', progress: 0, profileUrl: null as string | null },
  openProfilePicker: vi.fn(),
  tile: undefined as undefined | Record<string, any>,
  viewers: { data: undefined as unknown, loading: false },
  viewersOpts: undefined as unknown,
  follow: vi.fn(),
  isFollowing: vi.fn(),
  followLoading: false,
}));

vi.mock('../../../components/status-upload/StatusUploadProvider', () => ({
  useStatusUpload: () => ({ upload: h.upload, openProfilePicker: h.openProfilePicker }),
}));
vi.mock('../HomeStatusTile', () => ({
  default: (p: Record<string, any>) => {
    h.tile = p;
    return <button data-testid="tile" onClick={p.onClick} />;
  },
}));
vi.mock('@apollo/client/react', async (orig) => ({
  ...(await orig<object>()),
  useQuery: (_doc: unknown, opts: unknown) => {
    h.viewersOpts = opts;
    return h.viewers;
  },
}));
vi.mock('../../../hooks/useFollowedClubs', () => ({
  useFollowedClubs: () => ({ isFollowing: h.isFollowing, follow: h.follow, loading: h.followLoading }),
}));

const Where = () => <div data-testid="where">{useLocation().pathname}</div>;
const inRouter = (ui: ReactNode) =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={ui} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  h.upload = { active: false, kind: 'profile', progress: 0, profileUrl: null };
  h.tile = undefined;
  h.viewers = { data: undefined, loading: false };
  h.followLoading = false;
  h.isFollowing.mockReturnValue(false);
  h.follow.mockResolvedValue(undefined);
});
afterEach(() => vi.restoreAllMocks());

describe('MyStatusUploadTile', () => {
  const story = (over: object = {}) => ({ image_url: 'story.jpg', media_type: 'IMAGE', ...over });

  it('invites adding a status when there are no stories and opens the picker on tap', () => {
    render(<MyStatusUploadTile me={{ full_name: 'Asha Verma', profile_photo: 'me.jpg' }} />);
    expect(h.tile).toMatchObject({ label: 'My status', add: true, active: false, imageUrl: 'me.jpg', videoUrl: null, initials: 'AV' });
    fireEvent.click(screen.getByTestId('tile'));
    expect(h.openProfilePicker).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('my-status-upload-tile-add')).not.toBeInTheDocument();
  });

  it('uses the uploaded profile url, or nothing, when there is no story and no profile photo', () => {
    h.upload.profileUrl = 'fresh.jpg';
    const { unmount } = render(<MyStatusUploadTile me={{ first_name: 'Asha' }} />);
    expect(h.tile).toMatchObject({ imageUrl: 'fresh.jpg', initials: 'A' });
    unmount();
    h.upload.profileUrl = null;
    render(<MyStatusUploadTile />);
    expect(h.tile?.imageUrl).toBeUndefined();
    expect(h.tile?.initials).toBe('');
  });

  it('shows the latest story image, views it on tap, and offers to add another', () => {
    const onView = vi.fn();
    render(<MyStatusUploadTile me={{ my_stories: [story()] }} onView={onView} />);
    expect(h.tile).toMatchObject({ add: false, active: true, imageUrl: 'story.jpg', videoUrl: null });
    fireEvent.click(screen.getByTestId('tile'));
    expect(onView).toHaveBeenCalledTimes(1);
    expect(h.openProfilePicker).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('my-status-upload-tile-add'));
    expect(h.openProfilePicker).toHaveBeenCalledTimes(1);
    expect(onView).toHaveBeenCalledTimes(1);
  });

  it('opens the picker on tap when there are stories but nothing to view them with', () => {
    render(<MyStatusUploadTile me={{ my_stories: [story()] }} />);
    fireEvent.click(screen.getByTestId('tile'));
    expect(h.openProfilePicker).toHaveBeenCalledTimes(1);
  });

  it('plays a video story as the tile video', () => {
    render(<MyStatusUploadTile me={{ my_stories: [story({ media_type: 'VIDEO', image_url: 'v.mp4' })] }} />);
    expect(h.tile).toMatchObject({ imageUrl: null, videoUrl: 'v.mp4' });
  });

  it('shows upload progress, ignores taps while uploading and hides the add button', () => {
    h.upload = { active: true, kind: 'profile', progress: 40, profileUrl: null };
    render(<MyStatusUploadTile me={{ my_stories: [story()] }} onView={vi.fn()} />);
    expect(h.tile?.label).toBe('Uploading…');
    expect(screen.getByText('40%')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '40');
    fireEvent.click(screen.getByTestId('tile'));
    expect(h.openProfilePicker).not.toHaveBeenCalled();
    expect(screen.queryByTestId('my-status-upload-tile-add')).not.toBeInTheDocument();
  });

  it('shows an indeterminate spinner before progress starts, and ignores another kind of upload', () => {
    h.upload = { active: true, kind: 'profile', progress: 0, profileUrl: null };
    const { unmount } = render(<MyStatusUploadTile me={{}} />);
    expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow');
    unmount();
    h.upload = { active: true, kind: 'club', progress: 70, profileUrl: null };
    render(<MyStatusUploadTile me={{}} />);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(h.tile?.label).toBe('My status');
  });
});

describe('StoryViewersDialog', () => {
  it('does not read viewers without a story and stays closed', () => {
    render(<StoryViewersDialog storyId={null} onClose={vi.fn()} />);
    expect((h.viewersOpts as { skip: boolean }).skip).toBe(true);
    expect(screen.queryByTestId('story-viewers-dialog')).not.toBeInTheDocument();
  });

  it('shows a loading line before the first answer', () => {
    h.viewers = { data: undefined, loading: true };
    render(<StoryViewersDialog storyId="s1" onClose={vi.fn()} />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.getByText('No views yet')).toBeInTheDocument();
  });

  it('says nobody has viewed the story yet', () => {
    h.viewers = { data: { storyViewers: [] }, loading: false };
    render(<StoryViewersDialog storyId="s1" onClose={vi.fn()} />);
    expect(screen.getByText('No one has viewed this story yet.')).toBeInTheDocument();
  });

  it('counts and lists the viewers, naming an unknown one Someone, and closes', () => {
    h.viewers = {
      data: {
        storyViewers: [
          { user_id: 'u1', viewed_at: 'x', user: { full_name: 'Asha', profile_photo: 'a.jpg' } },
          { user_id: 'u2', viewed_at: 'x', user: null },
        ],
      },
      loading: false,
    };
    const onClose = vi.fn();
    render(<StoryViewersDialog storyId="s1" onClose={onClose} />);
    expect(screen.getByText('Seen by 2')).toBeInTheDocument();
    expect(screen.getByTestId('story-viewer-u1')).toHaveTextContent('Asha');
    expect(screen.getByTestId('story-viewer-u2')).toHaveTextContent('Someone');
    fireEvent.click(screen.getByTestId('story-viewers-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps showing viewers while a refresh is loading', () => {
    h.viewers = { data: { storyViewers: [{ user_id: 'u1', viewed_at: 'x', user: { full_name: 'Asha' } }] }, loading: true };
    render(<StoryViewersDialog storyId="s1" onClose={vi.fn()} />);
    expect(screen.getByTestId('story-viewer-u1')).toBeInTheDocument();
  });
});

describe('StatusOptionsMenu', () => {
  it('offers Delete on an own slide, closes the menu and deletes that slide', async () => {
    const onDelete = vi.fn();
    render(<StatusOptionsMenu slideId="slide9" onDelete={onDelete} />);
    expect(screen.getByTestId('status-kebab')).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(screen.getByTestId('status-kebab'));
    expect(screen.getByTestId('status-kebab')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.queryByTestId('status-report')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('status-delete'));
    expect(onDelete).toHaveBeenCalledWith('slide9');
    await waitFor(() => expect(screen.queryByTestId('status-delete')).not.toBeInTheDocument());
  });

  it('offers Report, not Delete, on somebody else slide', () => {
    const onReport = vi.fn();
    render(<StatusOptionsMenu slideId="slide3" onReport={onReport} />);
    fireEvent.click(screen.getByTestId('status-kebab'));
    expect(screen.queryByTestId('status-delete')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('status-report'));
    expect(onReport).toHaveBeenCalledWith('slide3');
  });

  it('closes on Escape without acting', async () => {
    const onDelete = vi.fn();
    render(<StatusOptionsMenu slideId="s" onDelete={onDelete} onReport={vi.fn()} />);
    fireEvent.click(screen.getByTestId('status-kebab'));
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByTestId('status-delete')).not.toBeInTheDocument());
    expect(onDelete).not.toHaveBeenCalled();
  });
});

describe('ClubRecommendationRow', () => {
  const club = (id: string, over: object = {}) => ({
    id,
    club_id: `slug-${id}`,
    club_name: `Club ${id}`,
    location_id: 'loc1',
    followers_count: 5,
    is_verified: true,
    club_feature_images_and_videos: [{ url: 'v.mp4', type: 'VIDEO' }, { url: 'logo.png', type: 'IMAGE' }],
    ...over,
  });
  const locations = [{ id: 'loc1', location_name: 'Pune' }];

  it('renders nothing without clubs', () => {
    const { container } = inRouter(<ClubRecommendationRow clubs={[]} />);
    expect(container.querySelector('[data-testid="club-recommendation"]')).toBeNull();
  });

  it('recommends a club the viewer does not follow yet, with city, members, verified mark and logo', () => {
    h.isFollowing.mockImplementation((id: string) => id === 'a');
    vi.spyOn(Math, 'random').mockReturnValue(0);
    inRouter(<ClubRecommendationRow clubs={[club('a'), club('b')]} locations={locations} />);
    const row = screen.getByTestId('club-recommendation');
    expect(row).toHaveTextContent('Club b');
    expect(row).toHaveTextContent(`Pune · ${fallbackT('mweb.home.membersMany', { count: 5 })}`);
    expect(screen.getByTitle(fallbackT('mweb.explore.verifiedClub'))).toBeInTheDocument();
    expect(row.querySelector('img')).toHaveAttribute('src', 'logo.png');
  });

  it('falls back to any club when the viewer follows them all, and shows Joined', () => {
    h.isFollowing.mockReturnValue(true);
    vi.spyOn(Math, 'random').mockReturnValue(0);
    inRouter(<ClubRecommendationRow clubs={[club('a')]} />);
    expect(screen.getByTestId('club-recommendation-join')).toBeDisabled();
    expect(screen.getByTestId('club-recommendation-join')).toHaveTextContent(fallbackT('mweb.home.joinedClub'));
  });

  it('keeps the pick stable when a follow changes, instead of re-rolling', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    const { rerender } = render(
      <MemoryRouter>
        <ClubRecommendationRow clubs={[club('a'), club('b')]} />
      </MemoryRouter>
    );
    expect(screen.getByTestId('club-recommendation')).toHaveTextContent('Club a');
    random.mockReturnValue(0.99);
    rerender(
      <MemoryRouter>
        <ClubRecommendationRow clubs={[club('a', { followers_count: 6 }), club('b')]} />
      </MemoryRouter>
    );
    expect(screen.getByTestId('club-recommendation')).toHaveTextContent('Club a');
  });

  it.each([
    [0, '', 'Pune'],
    [1, fallbackT('mweb.home.membersOne'), `Pune · ${fallbackT('mweb.home.membersOne')}`],
  ])('shows the meta line for %s members', (count, _label, expected) => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    inRouter(<ClubRecommendationRow clubs={[club('a', { followers_count: count })]} locations={locations} />);
    expect(screen.getByTestId('club-recommendation')).toHaveTextContent(expected);
  });

  it('shows no meta line when there is no city and no members, and uses the first letter when there is no logo', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    inRouter(
      <ClubRecommendationRow
        clubs={[club('a', { followers_count: undefined, location_id: 'other', is_verified: false, club_feature_images_and_videos: undefined })]}
        locations={locations}
      />
    );
    const row = screen.getByTestId('club-recommendation');
    expect(row).not.toHaveTextContent('·');
    expect(row).toHaveTextContent('C');
    expect(screen.queryByTitle(fallbackT('mweb.explore.verifiedClub'))).not.toBeInTheDocument();
  });

  it('opens the club by its slug, or its id when it has no slug', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { unmount } = inRouter(<ClubRecommendationRow clubs={[club('a')]} />);
    fireEvent.click(screen.getByTestId('club-recommendation-open'));
    expect(screen.getByTestId('where').textContent).toContain('slug-a');
    unmount();
    inRouter(<ClubRecommendationRow clubs={[club('a', { club_id: undefined })]} />);
    fireEvent.click(screen.getByTestId('club-recommendation-open'));
    expect(screen.getByTestId('where').textContent).toContain('a');
  });

  it('joins in place without opening the club, and survives a failed follow', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    h.follow.mockRejectedValue(new Error('offline'));
    inRouter(<ClubRecommendationRow clubs={[club('a')]} />);
    fireEvent.click(screen.getByTestId('club-recommendation-join'));
    await act(async () => undefined);
    expect(h.follow).toHaveBeenCalledWith('a');
    expect(screen.queryByTestId('where')).not.toBeInTheDocument();
  });

  it('cannot join while follows are loading', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    h.followLoading = true;
    inRouter(<ClubRecommendationRow clubs={[club('a')]} />);
    expect(screen.getByTestId('club-recommendation-join')).toBeDisabled();
  });
});
