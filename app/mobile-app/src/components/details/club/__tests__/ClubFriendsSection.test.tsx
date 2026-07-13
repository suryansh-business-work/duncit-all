import { act, fireEvent, screen } from '@testing-library/react-native';
import { ClubFriendsSection } from '../ClubFriendsSection';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));

const { graphqlRequest } = jest.requireMock('@/services/graphql.client') as {
  graphqlRequest: jest.MockedFunction<(...args: any[]) => Promise<any>>;
};

describe('ClubFriendsSection', () => {
  beforeEach(() => {
    graphqlRequest.mockResolvedValue({
      publicUsersByIds: [
        { user_id: 'u1', full_name: 'Alice', profile_photo: null },
        { user_id: 'u2', full_name: 'Bob', profile_photo: null },
      ],
    });
  });

  it('renders nothing when friendIds is empty', async () => {
    renderWithProviders(<ClubFriendsSection friendIds={[]} onOpenProfile={jest.fn()} />);
    await act(async () => {});
    // No "Friends Here" heading shown when there are no friends
    expect(screen.queryByText('Friends Here')).toBeNull();
  });

  it('shows friends once profiles load', async () => {
    renderWithProviders(<ClubFriendsSection friendIds={['u1', 'u2']} onOpenProfile={jest.fn()} />);
    await act(async () => {});
    expect(screen.getByTestId('club-friends')).toBeOnTheScreen();
    expect(screen.getByText('Alice and 1 more')).toBeOnTheScreen();
  });

  it('shows full list modal on View all tap', async () => {
    renderWithProviders(<ClubFriendsSection friendIds={['u1', 'u2']} onOpenProfile={jest.fn()} />);
    await act(async () => {});
    fireEvent.press(screen.getByText('View all'));
    expect(screen.getByText('Friends in this club')).toBeOnTheScreen();
    expect(screen.getByText('Bob')).toBeOnTheScreen();
  });

  it('calls onOpenProfile when a friend is tapped in the modal', async () => {
    const onOpenProfile = jest.fn();
    renderWithProviders(
      <ClubFriendsSection friendIds={['u1', 'u2']} onOpenProfile={onOpenProfile} />,
    );
    await act(async () => {});
    fireEvent.press(screen.getByText('View all'));
    fireEvent.press(screen.getByText('Alice'));
    expect(onOpenProfile).toHaveBeenCalledWith('u1');
  });

  it('closes modal on X button press', async () => {
    renderWithProviders(<ClubFriendsSection friendIds={['u1', 'u2']} onOpenProfile={jest.fn()} />);
    await act(async () => {});
    fireEvent.press(screen.getByText('View all'));
    expect(screen.getByText('Friends in this club')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('friends-modal-close'));
    await act(async () => {});
  });

  it('handles graphql error gracefully', async () => {
    graphqlRequest.mockRejectedValue(new Error('network'));
    renderWithProviders(<ClubFriendsSection friendIds={['u1']} onOpenProfile={jest.fn()} />);
    await act(async () => {});
    // Should not crash; profiles empty → renders null
    expect(screen.queryByTestId('club-friends')).toBeNull();
  });

  it('shows a single friend name without "and N more"', async () => {
    graphqlRequest.mockResolvedValue({
      publicUsersByIds: [{ user_id: 'u1', full_name: 'Alice', profile_photo: null }],
    });
    renderWithProviders(<ClubFriendsSection friendIds={['u1']} onOpenProfile={jest.fn()} />);
    await act(async () => {});
    expect(screen.getByText('Alice')).toBeOnTheScreen();
  });

  it('falls back to "Friend" when first profile has no full_name', async () => {
    graphqlRequest.mockResolvedValue({
      publicUsersByIds: [{ user_id: 'u1', full_name: null, profile_photo: null }],
    });
    renderWithProviders(<ClubFriendsSection friendIds={['u1']} onOpenProfile={jest.fn()} />);
    await act(async () => {});
    expect(screen.getByText('Friend')).toBeOnTheScreen();
  });
});
