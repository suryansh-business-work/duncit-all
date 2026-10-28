import { renderToString } from 'react-dom/server';
import { MockedProvider } from '@apollo/client/testing/react';
import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalClock, offsetLabel } from '../../../layout/header/LocalClock';
import { renderWithProviders } from '../../test-utils';

describe('offsetLabel', () => {
  const instant = new Date('2026-11-21T13:30:00.000Z');

  it("names a zone's offset the way the platform writes it", () => {
    expect(offsetLabel(instant, 'Asia/Kolkata')).toBe('GMT+5:30');
    expect(offsetLabel(instant, 'America/New_York')).toBe('GMT-5');
    expect(offsetLabel(instant, 'UTC')).toBe('GMT');
  });

  it('follows daylight saving', () => {
    expect(offsetLabel(new Date('2026-07-01T12:00:00.000Z'), 'America/New_York')).toBe('GMT-4');
  });

  it('gives nothing for a zone the platform does not know', () => {
    expect(offsetLabel(instant, 'Mars/Olympus_Mons')).toBe('');
  });
});

describe('LocalClock', () => {
  beforeEach(() => {
    vi.stubEnv('TZ', 'Asia/Kolkata');
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date('2026-11-21T13:30:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("shows the reader's time as ISO 8601, with the instant and offset in the machine-readable stamp", () => {
    renderWithProviders(<LocalClock />);
    const clock = screen.getByTestId('header-clock');
    expect(clock.tagName).toBe('TIME');
    expect(clock.textContent).toBe('19:00 Asia/Kolkata · GMT+5:30');
    expect(clock).toHaveAttribute('datetime', '2026-11-21T19:00+05:30');
    expect(clock.firstChild?.textContent).toBe('19:00');
  });

  it('names the zone and its offset on hover, as a description rather than the name', async () => {
    renderWithProviders(<LocalClock />);
    const clock = screen.getByTestId('header-clock');
    fireEvent.mouseOver(clock);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Asia/Kolkata · GMT+5:30');
    expect(clock).not.toHaveAttribute('aria-label');
  });

  it('moves on with the minute', () => {
    renderWithProviders(<LocalClock />);
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByTestId('header-clock')).toHaveTextContent(/^19:01 /);
  });

  it('draws nothing in the server render, which cannot know the reader’s clock', () => {
    const html = renderToString(
      <MockedProvider>
        <LocalClock />
      </MockedProvider>,
    );
    expect(html).toBe('');
  });
});
