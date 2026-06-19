import { renderHook } from '@testing-library/react-native';

import { useFollowing } from '@/hooks/useFollowing';
import { useStatus } from '@/hooks/useStatus';
import { useStoryRail } from '@/hooks/useStoryRail';

jest.mock('@/hooks/useStatus');
jest.mock('@/hooks/useFollowing');

const mockedStatus = useStatus as jest.Mock;
const mockedFollowing = useFollowing as jest.Mock;

const ashaGroup = {
  authorId: 'u1',
  name: 'Asha',
  photo: null,
  slides: [
    {
      id: 's1',
      imageUrl: 'st.jpg',
      mediaType: 'IMAGE',
      caption: null,
      createdAt: '',
      expiresAt: null,
    },
  ],
  cover: {
    id: 's1',
    imageUrl: 'st.jpg',
    mediaType: 'IMAGE',
    caption: null,
    createdAt: '',
    expiresAt: null,
  },
};

beforeEach(() => {
  mockedStatus.mockReturnValue({ statuses: [ashaGroup], mine: null, isLoading: false });
  mockedFollowing.mockReturnValue({
    people: [
      { user_id: 'u1', full_name: 'Asha Verma', first_name: 'Asha', profile_photo: 'p.jpg' },
      { user_id: 'u2', full_name: 'No Story', first_name: 'No', profile_photo: null },
    ],
    followedClubs: [
      {
        id: 'c1',
        club_name: 'Runners',
        club_feature_images_and_videos: [{ url: 'club.jpg', type: 'IMAGE' }],
      },
      { id: 'c2', club_name: 'Empty', club_feature_images_and_videos: [] },
    ],
    followedPods: [
      {
        id: 'p1',
        pod_title: 'Sunset Jam',
        pod_images_and_videos: [{ url: 'pod.mp4', type: 'VIDEO' }],
      },
    ],
    isLoading: false,
  });
});

describe('useStoryRail (bug 3)', () => {
  it('mirrors mWeb order: clubs → pods → followed users (with media only)', () => {
    const { result } = renderHook(() => useStoryRail());
    expect(result.current.items.map((i) => i.key)).toEqual(['club-c1', 'pod-p1', 'user-u1']);
  });

  it('builds deep-link targets and sub-labels for each source', () => {
    const { result } = renderHook(() => useStoryRail());
    const [club, pod, user] = result.current.items;
    expect(club?.target).toEqual({ kind: 'club', id: 'c1', title: 'Runners' });
    expect(pod?.target).toEqual({ kind: 'pod', id: 'p1', title: 'Sunset Jam' });
    expect(pod?.cover.mediaType).toBe('VIDEO');
    expect(user?.target).toEqual({ kind: 'user', id: 'u1' });
    expect(user?.subLabel).toBe('Asha Verma');
  });

  it('skips clubs/pods without media and people without an active story', () => {
    const { result } = renderHook(() => useStoryRail());
    const keys = result.current.items.map((i) => i.key);
    expect(keys).not.toContain('club-c2'); // no media
    expect(keys).not.toContain('user-u2'); // no story
  });

  it('falls back through user fields and tolerates nullish media types/fields', () => {
    const storyGroup = {
      authorId: 'u3',
      name: 'Story Author',
      photo: 'g.jpg',
      slides: ashaGroup.slides,
      cover: ashaGroup.cover,
    };
    mockedStatus.mockReturnValue({ statuses: [storyGroup], mine: null, isLoading: false });
    mockedFollowing.mockReturnValue({
      people: [{ user_id: 'u3', full_name: null, first_name: null, profile_photo: null }],
      followedClubs: [
        {
          id: 'c3',
          club_name: 'NullType',
          club_feature_images_and_videos: [{ url: 'x.bin', type: null }],
        },
        { id: 'c4', club_name: 'NoMediaField' },
      ],
      followedPods: [{ id: 'p2', pod_title: 'NoMediaPod' }],
      isLoading: false,
    });
    const { result } = renderHook(() => useStoryRail());
    const user = result.current.items.find((i) => i.key === 'user-u3');
    expect(user?.name).toBe('Story Author'); // first_name/full_name null → group.name
    expect(user?.photo).toBe('g.jpg'); // profile_photo null → group.photo
    expect(user?.subLabel).toBeUndefined(); // full_name null → undefined
    const club = result.current.items.find((i) => i.key === 'club-c3');
    expect(club?.slides[0]?.mediaType).toBe('IMAGE'); // null type → IMAGE
    // Clubs/pods without a media field are skipped (?? [] → no cover slide).
    expect(result.current.items.find((i) => i.key === 'club-c4')).toBeUndefined();
    expect(result.current.items.find((i) => i.key === 'pod-p2')).toBeUndefined();
  });

  it('passes through my own story and a combined loading flag', () => {
    mockedStatus.mockReturnValue({ statuses: [], mine: ashaGroup, isLoading: true });
    mockedFollowing.mockReturnValue({
      people: [],
      followedClubs: [],
      followedPods: [],
      isLoading: false,
    });
    const { result } = renderHook(() => useStoryRail());
    expect(result.current.mine).toBe(ashaGroup);
    expect(result.current.items).toHaveLength(0);
    expect(result.current.isLoading).toBe(true);
  });
});
