/**
 * Two small chrome pieces around a call: the composer's overflow menu, and
 * the connection quality bar. The speed meter is a third-party package with
 * its own network timing, so it is stubbed to a fake that just holds onto the
 * callbacks the real one would eventually call.
 */
import { act, fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ComposerMenu from '../src/staff-chat/ComposerMenu';
import ConnectionMeter from '../src/staff-chat/ConnectionMeter';
import type { InternetSpeedMeterProps } from '../src/staff-chat/internet-meter';

let meterProps: InternetSpeedMeterProps | null = null;

vi.mock('../src/staff-chat/internet-meter', () => ({
  ReactInternetSpeedMeter: (props: InternetSpeedMeterProps) => {
    meterProps = props;
    return null;
  },
}));

describe('ComposerMenu', () => {
  it('opens on the more button, and shares a searched place from it', () => {
    const onShareLocation = vi.fn();
    const { container } = render(<ComposerMenu onShareLocation={onShareLocation} />);

    fireEvent.click(container.querySelector('button') as HTMLElement);
    fireEvent.click(document.body.querySelector('li') as HTMLElement);

    expect(onShareLocation).toHaveBeenCalledTimes(1);
  });

  it('offers the current-location item only when the caller wired one up', () => {
    const { container } = render(<ComposerMenu onShareLocation={vi.fn()} />);
    fireEvent.click(container.querySelector('button') as HTMLElement);
    expect(document.body.querySelectorAll('li')).toHaveLength(1);
  });

  it('shares the current device location, and closes the menu either way', () => {
    const onShareCurrentLocation = vi.fn();
    const { container } = render(
      <ComposerMenu onShareLocation={vi.fn()} onShareCurrentLocation={onShareCurrentLocation} />
    );

    fireEvent.click(container.querySelector('button') as HTMLElement);
    const items = document.body.querySelectorAll('li');
    expect(items).toHaveLength(2);

    fireEvent.click(items[1]);

    expect(onShareCurrentLocation).toHaveBeenCalledTimes(1);
  });
});

describe('ConnectionMeter', () => {
  it('draws nothing without a probe file to time', () => {
    expect(render(<ConnectionMeter />).container.innerHTML).toBe('');
    expect(render(<ConnectionMeter probeUrl="https://cdn.test/probe.jpg" />).container.innerHTML).toBe('');
    expect(render(<ConnectionMeter probeBytes={1000} />).container.innerHTML).toBe('');
  });

  it('shows an indeterminate bar and a checking tooltip before the first reading', () => {
    const { container } = render(<ConnectionMeter probeUrl="https://cdn.test/probe.jpg" probeBytes={1000} />);

    expect(container.querySelector('.MuiLinearProgress-indeterminate')).not.toBeNull();
  });

  it('shows a good connection once a fast reading comes in', () => {
    render(<ConnectionMeter probeUrl="https://cdn.test/probe.jpg" probeBytes={1000} />);

    act(() => {
      meterProps?.callbackFunctionOnNetworkTest?.(8);
    });

    expect(document.body.textContent).not.toContain('Slow connection');
  });

  it('flags a slow connection once a reading comes back under threshold', () => {
    const { container } = render(<ConnectionMeter probeUrl="https://cdn.test/probe.jpg" probeBytes={1000} />);

    act(() => {
      meterProps?.callbackFunctionOnNetworkDown?.(0.4);
    });

    expect(container.textContent).toContain('Slow connection');
    expect(container.querySelector('.MuiLinearProgress-determinate')).not.toBeNull();
  });

  it('reads an unusable speed value as zero rather than throwing, from either callback', () => {
    render(<ConnectionMeter probeUrl="https://cdn.test/probe.jpg" probeBytes={1000} />);

    expect(() => {
      act(() => {
        meterProps?.callbackFunctionOnNetworkTest?.(Number.NaN);
      });
    }).not.toThrow();
    expect(document.body.textContent).toContain('Slow connection');

    expect(() => {
      act(() => {
        meterProps?.callbackFunctionOnNetworkDown?.(Number.NaN);
      });
    }).not.toThrow();
    expect(document.body.textContent).toContain('Slow connection');
  });
});
