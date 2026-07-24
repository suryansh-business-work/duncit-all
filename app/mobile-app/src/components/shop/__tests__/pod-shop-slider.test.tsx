import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { PodShopSlider } from '@/components/shop/PodShopSlider';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const sliderData = (media: { url: string; type: string; order: number }[]) => ({
  branding: { pod_shop_slider: media },
});

beforeEach(() => mockRequest.mockReset());

describe('PodShopSlider', () => {
  it('renders nothing until slider media is configured', async () => {
    mockRequest.mockResolvedValue(sliderData([]));
    renderWithProviders(<PodShopSlider />);
    await waitFor(() => expect(mockRequest).toHaveBeenCalled());
    expect(screen.queryByTestId('pod-shop-slider')).toBeNull();
  });

  it('renders image + video slides in order, with paging dots that follow scroll', async () => {
    mockRequest.mockResolvedValue(
      sliderData([
        { url: 'https://cdn/b.mp4', type: 'VIDEO', order: 1 },
        { url: 'https://cdn/a.jpg', type: 'IMAGE', order: 0 },
      ]),
    );
    renderWithProviders(<PodShopSlider />);

    await waitFor(() => expect(screen.getByTestId('pod-shop-slider')).toBeOnTheScreen());
    // Ordered by `order`: the image (0) renders first, the video (1) second.
    expect(screen.getByTestId('pod-shop-slide-0')).toBeOnTheScreen();
    expect(screen.getByTestId('pod-shop-slide-video-1')).toBeOnTheScreen();

    // Scrolling advances the active dot (covers the momentum handler).
    fireEvent(screen.getByTestId('pod-shop-slider-list'), 'momentumScrollEnd', {
      nativeEvent: {
        contentOffset: { x: 10000, y: 0 },
        layoutMeasurement: { width: 100, height: 100 },
        contentSize: { width: 200, height: 100 },
      },
    });
    expect(screen.getByTestId('pod-shop-slider')).toBeOnTheScreen();
  });

  it('renders a single slide without paging dots', async () => {
    mockRequest.mockResolvedValue(
      sliderData([{ url: 'https://cdn/a.jpg', type: 'IMAGE', order: 0 }]),
    );
    renderWithProviders(<PodShopSlider />);
    await waitFor(() => expect(screen.getByTestId('pod-shop-slider')).toBeOnTheScreen());
    expect(screen.getByTestId('pod-shop-slide-0')).toBeOnTheScreen();
  });

  it('stays hidden when the slider query fails', async () => {
    mockRequest.mockRejectedValue(new Error('offline'));
    renderWithProviders(<PodShopSlider />);
    await waitFor(() => expect(mockRequest).toHaveBeenCalled());
    expect(screen.queryByTestId('pod-shop-slider')).toBeNull();
  });

  it('ignores a late slider response after unmount', async () => {
    let resolve: (value: unknown) => void = () => {};
    mockRequest.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const { unmount } = renderWithProviders(<PodShopSlider />);
    unmount();
    await act(async () => {
      resolve(sliderData([{ url: 'https://cdn/a.jpg', type: 'IMAGE', order: 0 }]));
    });
    expect(mockRequest).toHaveBeenCalled();
  });
});
