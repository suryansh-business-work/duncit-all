import { Linking } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { PodShopSlider, openSliderCta } from '@/components/shop/PodShopSlider';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const slide = (over: Record<string, unknown>) => ({
  heading: '',
  subheading: '',
  cta_label: '',
  cta_url: '',
  ...over,
});

const sliderData = (media: Record<string, unknown>[]) => ({
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
      resolve(sliderData([slide({ url: 'https://cdn/a.jpg', type: 'IMAGE', order: 0 })]));
    });
    expect(mockRequest).toHaveBeenCalled();
  });

  it('renders overlay copy + CTA (partial fields) and opens the CTA target', async () => {
    const spy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
    mockRequest.mockResolvedValue(
      sliderData([
        // heading + CTA, no subheading
        slide({
          url: 'https://cdn/a.jpg',
          type: 'IMAGE',
          order: 0,
          heading: 'Gear Up',
          cta_label: 'Shop Now',
          cta_url: 'https://x',
        }),
        // subheading only (no heading / CTA)
        slide({ url: 'https://cdn/b.jpg', type: 'IMAGE', order: 1, subheading: 'Top picks' }),
      ]),
    );
    renderWithProviders(<PodShopSlider />);
    expect(await screen.findByText('Gear Up')).toBeOnTheScreen();
    expect(screen.getByText('Top picks')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('pod-shop-slide-cta'));
    expect(spy).toHaveBeenCalledWith('https://x');
    spy.mockRestore();
  });

  it('openSliderCta opens external targets and ignores blanks/failures', async () => {
    const spy = jest.spyOn(Linking, 'openURL');
    spy.mockResolvedValueOnce(true as never);
    openSliderCta('https://a');
    expect(spy).toHaveBeenCalledWith('https://a');
    spy.mockRejectedValueOnce(new Error('no'));
    openSliderCta('https://b'); // rejection is swallowed
    await new Promise((r) => setTimeout(r, 0));
    openSliderCta('   '); // blank → early return, no extra call
    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });
});
