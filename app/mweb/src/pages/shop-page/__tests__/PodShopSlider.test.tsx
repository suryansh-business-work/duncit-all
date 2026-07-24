import '@testing-library/jest-dom/vitest';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MockedProvider } from '@apollo/client/testing';
import { render, screen, waitFor } from '@testing-library/react';
import PodShopSlider, { POD_SHOP_SLIDER } from '../PodShopSlider';

// react-slick measures the DOM; render its children directly for a deterministic test.
vi.mock('react-slick', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
// VideoMedia mounts a <video> element — keep it lightweight in the test.
vi.mock('../../../components/media/VideoMedia', () => ({
  default: ({ src }: { src: string }) => <div data-testid="slider-video">{src}</div>,
}));

const sliderMock = (media: unknown[]) => ({
  request: { query: POD_SHOP_SLIDER },
  result: { data: { branding: { pod_shop_slider: media } } },
});

describe('PodShopSlider', () => {
  it('renders nothing until slider media is configured', async () => {
    const { container } = render(
      <MockedProvider mocks={[sliderMock([]), sliderMock([])]}>
        <PodShopSlider />
      </MockedProvider>,
    );
    await waitFor(() =>
      expect(container.querySelector('[data-testid="pod-shop-slider"]')).not.toBeInTheDocument(),
    );
  });

  it('renders ordered image + video slides', async () => {
    const media = [
      { url: 'https://cdn/b.mp4', type: 'VIDEO', order: 1 },
      { url: 'https://cdn/a.jpg', type: 'IMAGE', order: 0 },
    ];
    render(
      <MockedProvider mocks={[sliderMock(media), sliderMock(media)]}>
        <PodShopSlider />
      </MockedProvider>,
    );
    expect(await screen.findByTestId('pod-shop-slider')).toBeInTheDocument();
    expect(screen.getByAltText('Pod Shop')).toHaveAttribute('src', 'https://cdn/a.jpg');
    expect(screen.getByTestId('slider-video')).toHaveTextContent('https://cdn/b.mp4');
  });
});
