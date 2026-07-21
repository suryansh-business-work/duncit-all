import { describe, expect, it, vi } from 'vitest';
import { MockedProvider } from '@apollo/client/testing';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ClubStoriesSection from '../ClubStoriesSection';
import { RECORD_STORY_VIEW } from '../../home-page/queries';
import { CLUB_STORIES } from '../../ClubDetailsPage/clubDetailsQueries';

vi.mock('../../../components/moments/MomentLightbox', () => ({
  default: () => null,
}));
vi.mock('../../../components/status-upload/StatusUploadProvider', () => ({
  useStatusUpload: () => ({ openClubPicker: vi.fn() }),
}));

const story = (id: string, name: string, seen: boolean) => ({
  id,
  image_url: `http://x/${id}.jpg`,
  media_type: 'IMAGE',
  caption: '',
  created_at: new Date().toISOString(),
  seen_by_me: seen,
  author: { user_id: `u-${id}`, full_name: name, profile_photo: null },
});

describe('ClubStoriesSection', () => {
  it('records a view when an unseen story opens, but not for a seen one', async () => {
    let recorded = false;
    const mocks = [
      {
        request: { query: CLUB_STORIES, variables: { id: 'c1' } },
        result: {
          data: { clubStories: [story('s1', 'Asha K', false), story('s2', 'Ravi M', true)] },
        },
      },
      {
        request: { query: RECORD_STORY_VIEW, variables: { id: 's1' } },
        result: () => {
          recorded = true;
          return { data: { recordStoryView: { id: 's1', seen_by_me: true, views_count: 1 } } };
        },
      },
    ];
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <ClubStoriesSection clubId="c1" />
      </MockedProvider>,
    );

    await waitFor(() => expect(screen.getByText('Asha')).toBeInTheDocument());
    expect(screen.getByText('Ravi')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Story by Asha K' }));
    await waitFor(() => expect(recorded).toBe(true));

    // A story that is already seen must not fire the mutation again (no mock
    // exists for it — an unexpected call would reject and fail the test).
    fireEvent.click(screen.getByRole('button', { name: 'Story by Ravi M' }));
    await waitFor(() => expect(recorded).toBe(true));
  });
});
