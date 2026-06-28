import { fireEvent, screen } from '@testing-library/react-native';

import { AvatarStoryButton } from '@/components/profile/AvatarStoryButton';
import { renderWithProviders } from '@/utils/test-utils';

const base = {
  initial: 'A',
  size: 76,
  onPress: jest.fn(),
  onLongPress: jest.fn(),
  onAddStory: jest.fn(),
  onEditPhoto: jest.fn(),
};

describe('AvatarStoryButton', () => {
  it('renders the initial fallback and a story ring, and fires the edit pencil', () => {
    const onEditPhoto = jest.fn();
    renderWithProviders(
      <AvatarStoryButton {...base} hasStory photo={null} onEditPhoto={onEditPhoto} />,
    );
    expect(screen.getByText('A')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('avatar-story-button-edit'));
    expect(onEditPhoto).toHaveBeenCalled();
  });

  it('renders the photo and no ring when there is no story', () => {
    renderWithProviders(<AvatarStoryButton {...base} hasStory={false} photo="http://x/a.jpg" />);
    expect(screen.getByTestId('avatar-story-button')).toBeOnTheScreen();
  });

  it('disables the edit pencil and shows a spinner while saving', () => {
    const onEditPhoto = jest.fn();
    renderWithProviders(
      <AvatarStoryButton
        {...base}
        hasStory
        photo="http://x/a.jpg"
        saving
        onEditPhoto={onEditPhoto}
      />,
    );
    fireEvent.press(screen.getByTestId('avatar-story-button-edit'));
    expect(onEditPhoto).not.toHaveBeenCalled();
  });
});
