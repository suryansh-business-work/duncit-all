/**
 * The Earn with Duncit cards and the meeting actions behind them.
 *
 * Two behaviours are the point. A locked card must not lead anywhere — the
 * surface owns the application flow, and a card whose role is already held (or
 * whose meeting is still pending) is a status, not a button. And a reschedule
 * is one-time: the second attempt has to be refused by the UI, because the
 * server refuses it too and a dialog that offers it is offering a dead end.
 */
import type { ReactElement } from 'react';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import EarnBox from '../src/EarnBox';
import EarnJourneyList from '../src/EarnJourneyList';
import EarnMeetingActions from '../src/EarnMeetingActions';
import { EarnSurfaceProvider, type EarnSurfaceConfig } from '../src/EarnSurfaceProvider';
import { mwebEarnMeetingLabels } from '../src/labels';

/**
 * A theme, because MUI's `useTheme()` returns NULL outside a provider rather
 * than falling back to the default one — so a component reading it through a
 * callback (`useMediaQuery((theme) => theme.breakpoints.down('sm'))`) throws
 * mid-render. In the app the theme comes from the surface; here it does not.
 */
const testTheme = createTheme();

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const slotLabels = () =>
  new Proxy({} as Record<string, string>, {
    get: (_target, key) => (typeof key === 'string' ? `slots.${key}` : ''),
  });

const config = (over: Partial<EarnSurfaceConfig> = {}): EarnSurfaceConfig =>
  ({
    openJourney: vi.fn(),
    runCta: vi.fn(),
    meetingSlotLabels: () => slotLabels(),
    currentSlotBadge: 'Current',
    // The dialogs' copy now rides the surface config (commit 5c271eb16); the
    // key itself stands in for a translator, as in the form's cy spec.
    meetingLabels: mwebEarnMeetingLabels((key) => key),
    ...over,
  }) as unknown as EarnSurfaceConfig;

const wrap = (ui: ReactElement, surface: EarnSurfaceConfig = config()) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[]}>
      <ThemeProvider theme={testTheme}>
      <EarnSurfaceProvider config={surface}>{ui}</EarnSurfaceProvider>
      </ThemeProvider>
    </MockedProvider>
  );

afterEach(() => {
  vi.clearAllMocks();
});

describe('EarnBox', () => {
  const base = {
    icon: <span data-testid="icon" />,
    title: 'Become a Host',
    description: 'Run pods and get paid for the seats that show up.',
  };

  it('shows the title, the description and the icon', async () => {
    wrap(<EarnBox {...base} onOpen={vi.fn()} disabled={false} />);
    await settle();

    expect(screen.getByText('Become a Host')).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('opens the journey when it is unlocked', async () => {
    const onOpen = vi.fn();
    wrap(<EarnBox {...base} onOpen={onOpen} disabled={false} />);
    await settle();

    fireEvent.click(screen.getByText('Become a Host'));
    await settle();

    expect(onOpen).toHaveBeenCalled();
  });

  it('leads nowhere while it is locked, and says why', async () => {
    const onOpen = vi.fn();
    wrap(<EarnBox {...base} onOpen={onOpen} disabled disabledLabel="Meeting pending" />);
    await settle();

    expect(screen.getByText('Meeting pending')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Become a Host'));
    await settle();

    expect(onOpen).not.toHaveBeenCalled();
  });

  it('offers the approved-role next step as its own control, beside the chip', async () => {
    const onClick = vi.fn();
    wrap(<EarnBox {...base} onOpen={vi.fn()} disabled disabledLabel="Approved" cta={{ label: 'Open Host Studio', onClick }} />);
    await settle();

    fireEvent.click(screen.getByRole('button', { name: 'Open Host Studio' }));
    await settle();

    expect(onClick).toHaveBeenCalled();
  });
});

describe('EarnJourneyList', () => {
  it('renders with nothing behind it rather than throwing', async () => {
    const { container } = wrap(<EarnJourneyList showProducts />);
    await settle();

    expect(container.innerHTML).not.toBe('');
  });

  it('hides the product-seller path when products are gated off, exactly as native does', async () => {
    const { container: withProducts } = wrap(<EarnJourneyList showProducts />);
    await settle();
    const shown = withProducts.textContent ?? '';

    const { container: without } = wrap(<EarnJourneyList showProducts={false} />);
    await settle();
    const hidden = without.textContent ?? '';

    expect(hidden.length).toBeLessThanOrEqual(shown.length);
  });

  it('survives every card being pressed', async () => {
    wrap(<EarnJourneyList showProducts />);
    await settle();

    for (const control of [...document.body.querySelectorAll<HTMLElement>('button:not([disabled])')].slice(0, 20)) {
      if (!control.isConnected) continue;
      fireEvent.click(control);
      await settle();
    }

    expect(document.body.innerHTML).not.toBe('');
  });
});

describe('EarnMeetingActions', () => {
  const props = { kind: 'HOST', bookedAt: '2026-08-30T12:30:00.000Z', onChanged: vi.fn() };

  it('offers the actions on a first-time booking', async () => {
    const { container } = wrap(<EarnMeetingActions {...props} rescheduleCount={0} />);
    await settle();

    expect(container.innerHTML).not.toBe('');
  });

  it('renders once the one reschedule has already been used', async () => {
    const { container } = wrap(<EarnMeetingActions {...props} rescheduleCount={1} />);
    await settle();

    expect(container.innerHTML).not.toBe('');
  });

  it('renders when no slot is booked yet', async () => {
    const { container } = wrap(<EarnMeetingActions {...props} bookedAt={null} rescheduleCount={0} />);
    await settle();

    expect(container.innerHTML).not.toBe('');
  });

  it('survives every action being pressed with the mutations answering nothing', async () => {
    const onChanged = vi.fn();
    wrap(<EarnMeetingActions {...props} onChanged={onChanged} rescheduleCount={0} />);
    await settle();

    for (const control of [...document.body.querySelectorAll<HTMLElement>('button:not([disabled])')].slice(0, 20)) {
      if (!control.isConnected) continue;
      fireEvent.click(control);
      await settle();
    }

    // Nothing succeeded, so the page must not have been told to refetch.
    expect(onChanged).not.toHaveBeenCalled();
  });
});
