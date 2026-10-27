import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import type { ReactNode } from 'react';

import PodCardMedia from '../PodCardMedia';
import SomethingForYouRail from '../SomethingForYouRail';
import { logs } from '@duncit/logs';

const h = vi.hoisted(() => ({ query: { data: undefined as unknown } }));

vi.mock('@apollo/client/react', async (orig) => ({ ...(await orig<object>()), useQuery: () => h.query }));

const Where = () => <div data-testid="where">{useLocation().pathname}</div>;
const inRouter = (ui: ReactNode) =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={ui} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>
  );

type ObserverCallback = (entries: Array<{ isIntersecting: boolean }>) => void;
let observed: { callback: ObserverCallback; disconnect: ReturnType<typeof vi.fn> } | null = null;
const OriginalObserver = globalThis.IntersectionObserver;

beforeEach(() => {
  observed = null;
  h.query = { data: undefined };
  class FakeObserver {
    disconnect = vi.fn();
    constructor(callback: ObserverCallback) {
      observed = { callback, disconnect: this.disconnect };
    }
    observe() {}
    unobserve() {}
    takeRecords() {
      return [];
    }
  }
  globalThis.IntersectionObserver = FakeObserver as never;
});
afterEach(() => {
  globalThis.IntersectionObserver = OriginalObserver;
  vi.restoreAllMocks();
});

describe('PodCardMedia', () => {
  it('shows a calm panel when the pod has no media', () => {
    const { container } = render(<PodCardMedia media={null} title="Jam" />);
    expect(container.querySelector('img,video')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('shows an image with the pod title as its alt text, lazily', () => {
    render(<PodCardMedia media={{ url: 'https://img.example/a.jpg', type: 'IMAGE' }} title="Jam night" />);
    const img = screen.getByAltText('Jam night');
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img.getAttribute('src')).toContain('a.jpg');
  });

  it('plays a video only while it is on screen and pauses it when it leaves', () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    const { container, unmount } = render(<PodCardMedia media={{ url: 'https://vid.example/a.mp4', type: 'VIDEO' }} title="Jam" />);
    const video = container.querySelector('video') as HTMLVideoElement;
    expect(video.muted).toBe(true);
    expect(video.loop).toBe(true);
    expect(video).toHaveAttribute('preload', 'none');
    observed?.callback([{ isIntersecting: true }]);
    expect(play).toHaveBeenCalledTimes(1);
    observed?.callback([{ isIntersecting: false }]);
    expect(pause).toHaveBeenCalledTimes(1);
    const disconnect = observed?.disconnect;
    unmount();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('logs, rather than throws, when the browser refuses to play', async () => {
    const debug = vi.spyOn(logs.mWeb, 'debug').mockImplementation(() => undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValue(new Error('interrupted'));
    render(<PodCardMedia media={{ url: 'https://vid.example/a.mp4', type: 'VIDEO' }} title="Jam" />);
    observed?.callback([{ isIntersecting: true }]);
    await Promise.resolve();
    await Promise.resolve();
    expect(debug).toHaveBeenCalledWith('PodCardMedia', 'play', expect.objectContaining({ error: expect.any(Error) }));
  });
});

describe('SomethingForYouRail', () => {
  const item = (over: object = {}) => ({ id: 'i1', title: 'Offer', image_url: 'o.jpg', bottom_text: 'Today only', action_type: 'NONE', link_path: null, link_url: null, ...over });

  it('renders nothing when there are no items or no data', () => {
    const { container, unmount } = inRouter(<SomethingForYouRail />);
    expect(container.querySelector('[data-testid="something-for-you-rail"]')).toBeNull();
    unmount();
    h.query = { data: { publicSomethingForYou: [] } };
    const second = inRouter(<SomethingForYouRail />);
    expect(second.container.querySelector('[data-testid="something-for-you-rail"]')).toBeNull();
  });

  it('shows a card with no destination as a plain picture with its title and bottom text', () => {
    h.query = { data: { publicSomethingForYou: [item()] } };
    inRouter(<SomethingForYouRail />);
    const tile = screen.getByTestId('something-for-you-tile-i1');
    expect(tile.tagName).not.toBe('BUTTON');
    expect(tile).toHaveTextContent('Offer');
    expect(tile).toHaveTextContent('Today only');
    fireEvent.click(tile);
    expect(screen.queryByTestId('where')).not.toBeInTheDocument();
  });

  it('leaves out the bottom text when there is none', () => {
    h.query = { data: { publicSomethingForYou: [item({ bottom_text: null })] } };
    inRouter(<SomethingForYouRail />);
    expect(screen.getByTestId('something-for-you-tile-i1')).not.toHaveTextContent('Today only');
  });

  it('opens an in-app route from a route card', () => {
    h.query = { data: { publicSomethingForYou: [item({ action_type: 'ROUTE', link_path: '/pods' })] } };
    inRouter(<SomethingForYouRail />);
    const tile = screen.getByTestId('something-for-you-tile-i1');
    expect(tile.tagName).toBe('BUTTON');
    fireEvent.click(tile);
    expect(screen.getByTestId('where')).toHaveTextContent('/pods');
  });

  it('opens an outside address in a new tab without opener access', () => {
    const open = vi.spyOn(globalThis, 'open').mockImplementation(() => null);
    h.query = { data: { publicSomethingForYou: [item({ action_type: 'URL', link_url: 'https://partner.example' })] } };
    inRouter(<SomethingForYouRail />);
    fireEvent.click(screen.getByTestId('something-for-you-tile-i1'));
    expect(open).toHaveBeenCalledWith('https://partner.example', '_blank', 'noopener,noreferrer');
    expect(screen.queryByTestId('where')).not.toBeInTheDocument();
  });

  it('treats a route card with no path as a plain picture', () => {
    h.query = { data: { publicSomethingForYou: [item({ action_type: 'ROUTE', link_path: '' })] } };
    inRouter(<SomethingForYouRail />);
    expect(screen.getByTestId('something-for-you-tile-i1').tagName).not.toBe('BUTTON');
  });
});
