import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import ClubStoryTiles from '../ClubStoryTiles';

const h = vi.hoisted(() => ({ openClubPicker: vi.fn() }));
vi.mock('../../../components/status-upload/StatusUploadProvider', () => ({ useStatusUpload: () => ({ openClubPicker: h.openClubPicker }) }));

const story = (id: string, over: object = {}) => ({
  id,
  image_url: `https://img/${id}.jpg`,
  media_type: 'IMAGE',
  seen_by_me: false,
  author: { user_id: `u-${id}`, full_name: 'Asha Rao', profile_photo: null },
  ...over,
});

describe('ClubStoryTiles', () => {
  it('shows the Add tile only to someone who may post, and opens the picker for this club', () => {
    const { unmount } = render(<ClubStoryTiles clubId="c1" canPost stories={[]} onOpen={vi.fn()} />);
    fireEvent.click(screen.getByTestId('club-story-add'));
    expect(h.openClubPicker).toHaveBeenCalledWith('c1');
    unmount();
    render(<ClubStoryTiles clubId="c1" canPost={false} stories={[]} onOpen={vi.fn()} />);
    expect(screen.queryByTestId('club-story-add')).not.toBeInTheDocument();
  });

  it('shows one tile per story with the author first name, opening it by index', () => {
    const onOpen = vi.fn();
    render(<ClubStoryTiles clubId="c1" canPost={false} stories={[story('s1'), story('s2', { seen_by_me: true })] as never} onOpen={onOpen} />);
    expect(screen.getByTestId('club-story-s1')).toHaveTextContent('Asha');
    expect(screen.getByTestId('club-story-s1')).toHaveAccessibleName('Story by Asha Rao');
    fireEvent.click(screen.getByTestId('club-story-s2'));
    expect(onOpen).toHaveBeenCalledWith(1);
  });

  it('names a story with no author as a member', () => {
    render(<ClubStoryTiles clubId="c1" canPost={false} stories={[story('s1', { author: null })] as never} onOpen={vi.fn()} />);
    expect(screen.getByTestId('club-story-s1')).toHaveTextContent('Member');
    expect(screen.getByTestId('club-story-s1')).toHaveAccessibleName('Story by member');
  });
});
