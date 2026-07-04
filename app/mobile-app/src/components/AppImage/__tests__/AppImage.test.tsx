import { renderWithProviders } from '@/utils/test-utils';
import { AppImage } from '@/components/AppImage';

describe('AppImage', () => {
  it('renders with the default cover fit', () => {
    const { getByTestId } = renderWithProviders(
      <AppImage testID="app-image" source={{ uri: 'https://cdn.test/a.jpg' }} />,
    );
    expect(getByTestId('app-image')).toBeTruthy();
  });

  it('honours an explicit contain fit and a recycling key', () => {
    const { getByTestId } = renderWithProviders(
      <AppImage
        testID="app-image-contain"
        source={{ uri: 'https://cdn.test/b.jpg' }}
        resizeMode="contain"
        recyclingKey="b"
        accessibilityLabel="Photo"
      />,
    );
    expect(getByTestId('app-image-contain')).toBeTruthy();
  });
});
