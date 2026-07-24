import '@testing-library/jest-dom/vitest';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MockedProvider } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PodShopSlider, { POD_SHOP_SLIDER } from '../PodShopSlider';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (io) => {
  const actual = await io<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});
// react-slick measures the DOM; render its children directly for a deterministic test.
vi.mock('react-slick', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
// VideoMedia mounts a <video> element — keep it lightweight in the test.
vi.mock('../../../components/media/VideoMedia', () => ({
  default: ({ src }: { src: string }) => <div data-testid="slider-video">{src}</div>,
}));

const slide = (over: Record<string, unknown>) => ({
  heading: '',
  subheading: '',
  cta_label: '',
  cta_url: '',
  ...over,
});

const sliderMock = (media: unknown[]) => ({
  request: { query: POD_SHOP_SLIDER },
  result: { data: { branding: { pod_shop_slider: media } } },
});

const renderSlider = (media: unknown[]) =>
  render(
    <MockedProvider mocks={[sliderMock(media), sliderMock(media)]}>
      <MemoryRouter>
        <PodShopSlider />
      </MemoryRouter>
    </MockedProvider>,
  );

describe('PodShopSlider', () => {
  it('renders nothing until slider media is configured', async () => {
    const { container } = renderSlider([]);
    await waitFor(() =>
      expect(container.querySelector('[data-testid="pod-shop-slider"]')).not.toBeInTheDocument(),
    );
  });

  it('renders ordered image + video slides', async () => {
    renderSlider([
      slide({ url: 'https://cdn/b.mp4', type: 'VIDEO', order: 1 }),
      slide({ url: 'https://cdn/a.jpg', type: 'IMAGE', order: 0 }),
    ]);
    expect(await screen.findByTestId('pod-shop-slider')).toBeInTheDocument();
    expect(screen.getByAltText('Pod Shop')).toHaveAttribute('src', 'https://cdn/a.jpg');
    expect(screen.getByTestId('slider-video')).toHaveTextContent('https://cdn/b.mp4');
  });

  it('renders the overlay heading + CTA and navigates on click', async () => {
    renderSlider([
      slide({
        url: 'https://cdn/a.jpg',
        type: 'IMAGE',
        order: 0,
        heading: 'Gear Up',
        subheading: 'Top picks',
        cta_label: 'Shop Now',
        cta_url: '/shop',
      }),
    ]);
    expect(await screen.findByText('Gear Up')).toBeInTheDocument();
    expect(screen.getByText('Top picks')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Shop Now' }));
    expect(mockNavigate).toHaveBeenCalledWith('/shop');
  });
});
