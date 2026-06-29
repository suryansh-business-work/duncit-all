import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { LikesListSheet } from '@/components/explore/LikesListSheet';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: mockNavigate }),
}));

const likers = [
  {
    user_id: 'u1',
    full_name: 'Asha Roy',
    first_name: 'Asha',
    username: 'asha',
    profile_photo: 'http://x/a.jpg',
  },
  { user_id: 'u2', full_name: null, first_name: 'Bo', username: null, profile_photo: null },
  { user_id: 'u3', full_name: null, first_name: null, username: null, profile_photo: null },
];

describe('LikesListSheet', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockRequest.mockReset();
  });

  it('loads likers and opens a profile on tap', async () => {
    mockRequest.mockResolvedValueOnce({ publicUsersByIds: likers });
    renderWithProviders(<LikesListSheet open userIds={['u1', 'u2']} onClose={jest.fn()} />);

    await waitFor(() => expect(screen.getByText('Asha Roy')).toBeOnTheScreen());
    // Photo-less liker falls back to first_name + person icon.
    expect(screen.getByText('Bo')).toBeOnTheScreen();
    expect(screen.getByText('@asha')).toBeOnTheScreen();
    // Name-less liker falls back to the generic "User" label.
    expect(screen.getByText('User')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('liker-u1'));
    expect(mockNavigate).toHaveBeenCalledWith('PublicProfile', { userId: 'u1' });
  });

  it('shows the empty state when there are no likers', () => {
    renderWithProviders(<LikesListSheet open userIds={[]} onClose={jest.fn()} />);
    expect(screen.getByTestId('likes-empty')).toBeOnTheScreen();
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('clears to empty when the request fails and closes via the backdrop', async () => {
    mockRequest.mockRejectedValueOnce(new Error('boom'));
    const onClose = jest.fn();
    renderWithProviders(<LikesListSheet open userIds={['u1']} onClose={onClose} />);

    await waitFor(() => expect(screen.getByTestId('likes-empty')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('likes-close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('does not fetch while closed', () => {
    renderWithProviders(<LikesListSheet open={false} userIds={['u1']} onClose={jest.fn()} />);
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('aborts a stale success after unmount/userIds change', async () => {
    let resolve: (v: unknown) => void = () => {};
    mockRequest.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    const { unmount } = renderWithProviders(
      <LikesListSheet open userIds={['u1']} onClose={jest.fn()} />,
    );
    unmount();
    await act(async () => {
      resolve({ publicUsersByIds: likers });
    });
    // No assertion errors = the active-guard prevented a post-unmount setState.
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it('aborts a stale failure after unmount', async () => {
    let reject: (e: unknown) => void = () => {};
    mockRequest.mockReturnValueOnce(new Promise((_r, rej) => (reject = rej)));
    const { unmount } = renderWithProviders(
      <LikesListSheet open userIds={['u1']} onClose={jest.fn()} />,
    );
    unmount();
    await act(async () => {
      reject(new Error('late'));
    });
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });
});
