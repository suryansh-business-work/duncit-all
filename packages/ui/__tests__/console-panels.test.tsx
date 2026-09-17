import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { createTheme } from '@mui/material/styles';
import { SectionCard } from '../src/SectionCard';
import { FillViewport } from '../src/FillViewport';
import { chartSeriesColor } from '../src/chartSeriesColor';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SectionCard', () => {
  it('renders the title, subtitle, action and body', () => {
    render(
      <SectionCard title="Daily requests" subtitle="DUN-POD-4821 window" action={<button type="button">Refresh</button>}>
        <p>12 verified</p>
      </SectionCard>,
    );
    expect(screen.getByText('Daily requests')).toBeInTheDocument();
    expect(screen.getByText('DUN-POD-4821 window')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
    expect(screen.getByText('12 verified')).toBeInTheDocument();
  });

  it('leaves the subtitle out when none is given', () => {
    render(
      <SectionCard title="Phases">
        <p>body</p>
      </SectionCard>,
    );
    expect(screen.getByText('Phases')).toBeInTheDocument();
    expect(screen.queryByText('DUN-POD-4821 window')).not.toBeInTheDocument();
  });
});

describe('FillViewport', () => {
  it('sizes itself to the viewport below its own top, with the default gutter', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    vi.stubGlobal('innerHeight', 1000);
    render(
      <FillViewport>
        <p>panes</p>
      </FillViewport>,
    );
    const box = screen.getByText('panes').parentElement as HTMLElement;
    // jsdom lays nothing out, so the top is 0: 1000 - 0 - 24.
    expect(box).toHaveStyle({ height: '976px' });
  });

  it('never shrinks below the floor, and re-measures on resize', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    vi.stubGlobal('innerHeight', 200);
    render(
      <FillViewport gutter={10}>
        <p>short</p>
      </FillViewport>,
    );
    const box = screen.getByText('short').parentElement as HTMLElement;
    expect(box).toHaveStyle({ height: '360px' });

    vi.stubGlobal('innerHeight', 900);
    act(() => {
      globalThis.dispatchEvent(new Event('resize'));
    });
    expect(box).toHaveStyle({ height: '890px' });
  });

  it('follows a layout reflow through ResizeObserver and disconnects on unmount', () => {
    const observers: FakeResizeObserver[] = [];
    class FakeResizeObserver {
      readonly observe = vi.fn();
      readonly disconnect = vi.fn();
      constructor(readonly callback: () => void) {
        observers.push(this);
      }
    }
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    vi.stubGlobal('innerHeight', 600);
    const { unmount } = render(
      <FillViewport gutter={0}>
        <p>observed</p>
      </FillViewport>,
    );
    const box = screen.getByText('observed').parentElement as HTMLElement;
    const observer = observers[0] as FakeResizeObserver;
    expect(observer.observe).toHaveBeenCalledWith(document.body);

    vi.stubGlobal('innerHeight', 700);
    act(() => {
      observer.callback();
    });
    expect(box).toHaveStyle({ height: '700px' });

    unmount();
    expect(observer.disconnect).toHaveBeenCalled();
  });
});

describe('chartSeriesColor', () => {
  it('steps the palette per theme mode and wraps after three series', () => {
    const light = createTheme({ palette: { mode: 'light' } });
    const dark = createTheme({ palette: { mode: 'dark' } });
    expect(chartSeriesColor(light, 0)).toBe('#2a78d6');
    expect(chartSeriesColor(light, 2)).toBe('#1baf7a');
    expect(chartSeriesColor(dark, 1)).toBe('#d95926');
    expect(chartSeriesColor(dark, 3)).toBe('#3987e5');
  });
});
