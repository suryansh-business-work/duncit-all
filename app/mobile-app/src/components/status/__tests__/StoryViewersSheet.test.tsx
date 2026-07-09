import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { StoryViewersSheet } from '@/components/status/StoryViewersSheet';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockGraphql = graphqlRequest as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('StoryViewersSheet', () => {
  it('loads and lists viewers with a count, handling missing name/photo (Bug 4)', async () => {
    mockGraphql.mockResolvedValue({
      storyViewers: [
        {
          user_id: 'u1',
          viewed_at: '2026-06-09T10:00:00.000Z',
          user: { user_id: 'u1', full_name: 'Asha', profile_photo: 'http://x/a.jpg' },
        },
        { user_id: 'u2', viewed_at: '2026-06-09T09:00:00.000Z', user: null },
      ],
    });
    renderWithProviders(<StoryViewersSheet storyId="s1" onClose={jest.fn()} />);
    expect(screen.getByText('Loading…')).toBeOnTheScreen();
    await waitFor(() => expect(screen.getByText('Seen by 2')).toBeOnTheScreen());
    expect(screen.getByTestId('story-viewer-u1')).toBeOnTheScreen();
    expect(screen.getByText('Asha')).toBeOnTheScreen();
    expect(screen.getByText('Someone')).toBeOnTheScreen();
  });

  it('shows the empty state when nobody has viewed', async () => {
    mockGraphql.mockResolvedValue({ storyViewers: [] });
    renderWithProviders(<StoryViewersSheet storyId="s1" onClose={jest.fn()} />);
    await waitFor(() => expect(screen.getByText('No views yet')).toBeOnTheScreen());
    expect(screen.getByText('No one has viewed this story yet.')).toBeOnTheScreen();
  });

  it('falls back to an empty list when the query fails', async () => {
    mockGraphql.mockRejectedValue(new Error('nope'));
    renderWithProviders(<StoryViewersSheet storyId="s1" onClose={jest.fn()} />);
    await waitFor(() => expect(screen.getByText('No views yet')).toBeOnTheScreen());
  });

  it('does not fetch while closed', () => {
    renderWithProviders(<StoryViewersSheet storyId={null} onClose={jest.fn()} />);
    expect(mockGraphql).not.toHaveBeenCalled();
  });

  it('fires onClose from the header', async () => {
    mockGraphql.mockResolvedValue({ storyViewers: [] });
    const onClose = jest.fn();
    renderWithProviders(<StoryViewersSheet storyId="s1" onClose={onClose} />);
    await waitFor(() => expect(screen.getByText('No views yet')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('story-viewers-close'));
    expect(onClose).toHaveBeenCalled();
  });
});
