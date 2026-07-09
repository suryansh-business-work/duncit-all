import { fireEvent, screen } from '@testing-library/react-native';

import { ZoomableImageModal } from '@/components/details/ZoomableImageModal';
import { renderWithProviders } from '@/utils/test-utils';

const images = ['https://cdn/a.jpg', 'https://cdn/b.jpg', 'https://cdn/c.jpg'];

describe('ZoomableImageModal', () => {
  it('is hidden when index is null', () => {
    renderWithProviders(<ZoomableImageModal images={images} index={null} onClose={jest.fn()} />);
    expect(screen.queryByTestId('zoom-image-web')).toBeNull();
  });

  it('opens at the given index, pages next/prev (clamped), and closes', () => {
    const onClose = jest.fn();
    renderWithProviders(<ZoomableImageModal images={images} index={1} onClose={onClose} />);
    expect(screen.getByTestId('zoom-image-web')).toBeOnTheScreen();
    expect(screen.getByText('2 / 3')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('zoom-image-next'));
    expect(screen.getByText('3 / 3')).toBeOnTheScreen();
    // Next at the end is clamped.
    fireEvent.press(screen.getByTestId('zoom-image-next'));
    expect(screen.getByText('3 / 3')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('zoom-image-prev'));
    fireEvent.press(screen.getByTestId('zoom-image-prev'));
    // Prev at the start is clamped.
    fireEvent.press(screen.getByTestId('zoom-image-prev'));
    expect(screen.getByText('1 / 3')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('zoom-image-close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('hides the pager for a single image', () => {
    renderWithProviders(
      <ZoomableImageModal images={['https://cdn/only.jpg']} index={0} onClose={jest.fn()} />,
    );
    expect(screen.getByText('1 / 1')).toBeOnTheScreen();
    expect(screen.queryByTestId('zoom-image-next')).toBeNull();
  });
});
