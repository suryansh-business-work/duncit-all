import { fireEvent, screen } from '@testing-library/react-native';

import { ChatMessageBubble } from '@/components/chat/ChatMessageBubble';
import { ClubCard } from '@/components/home/ClubCard';
import { renderWithProviders } from '@/utils/test-utils';

const club = {
  id: 'c1',
  club_id: 'cl-1',
  club_name: 'Runners',
  club_description: 'We run',
  club_feature_images_and_videos: [],
  category_id: null,
  super_category_id: null,
} as never;

const message = (mine: boolean) =>
  ({
    id: 'm1',
    user_id: 'u1',
    user_name: 'Asha',
    user_photo: null,
    type: 'TEXT',
    text: mine ? 'mine' : 'theirs',
    image_url: null,
    createdAt: '2026-06-09T10:00:00.000Z',
  }) as never;

describe('ClubCard', () => {
  it('renders the name and fires onPress', () => {
    const onPress = jest.fn();
    renderWithProviders(<ClubCard club={club} onPress={onPress} />);
    expect(screen.getByText('Runners')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('club-card-cl-1'));
    expect(onPress).toHaveBeenCalled();
  });
});

describe('ChatMessageBubble', () => {
  it('renders the author name only for others', () => {
    const { rerender } = renderWithProviders(
      <ChatMessageBubble message={message(false)} mine={false} />,
    );
    expect(screen.getByText('Asha')).toBeOnTheScreen();
    expect(screen.getByText('theirs')).toBeOnTheScreen();

    rerender(<ChatMessageBubble message={message(true)} mine />);
    expect(screen.queryByText('Asha')).toBeNull();
    expect(screen.getByText('mine')).toBeOnTheScreen();
  });
});
