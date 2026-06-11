import { fireEvent, screen } from '@testing-library/react-native';

import { Mascot } from '@/components/Mascot';
import { useBranding } from '@/hooks/useBranding';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useBranding');
const mockedBranding = jest.mocked(useBranding);

describe('Mascot', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders nothing when no mascot image is configured', () => {
    mockedBranding.mockReturnValue({ data: { branding: { mascot_image_url: '' } } } as never);
    renderWithProviders(<Mascot />);
    expect(screen.queryByTestId('mascot-button')).toBeNull();
  });

  it('renders the uploaded mascot image and opens the meet sheet (HTML stripped)', () => {
    mockedBranding.mockReturnValue({
      data: {
        branding: {
          mascot_image_url: 'https://cdn.duncit.com/mascot.png',
          mascot_name: 'Antu',
          mascot_description_html: '<p>Your <strong>friendly</strong> guide.</p>',
        },
      },
    } as never);
    renderWithProviders(<Mascot />);
    expect(screen.getByTestId('mascot-image')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('mascot-button'));
    expect(screen.getByTestId('mascot-sheet')).toBeOnTheScreen();
    expect(screen.getByText('Meet Antu')).toBeOnTheScreen();
    expect(screen.getByText('Your friendly guide.')).toBeOnTheScreen();
  });

  it('opens without a description and closes from the backdrop', () => {
    mockedBranding.mockReturnValue({
      data: { branding: { mascot_image_url: 'https://cdn.duncit.com/mascot.png' } },
    } as never);
    renderWithProviders(<Mascot />);
    fireEvent.press(screen.getByTestId('mascot-button'));
    expect(screen.getByTestId('mascot-sheet')).toBeOnTheScreen();
    expect(screen.getByText('Meet Duncit')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('mascot-backdrop'));
    expect(screen.queryByTestId('mascot-sheet')).toBeNull();
  });
});
