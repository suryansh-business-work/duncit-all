/**
 * The referral page — a member's code, and who they have brought in.
 *
 * Three ways out, deliberately, because they travel differently: a code
 * survives being read out loud, a link does the typing for whoever receives it,
 * and the share sheet carries the message Finance wrote around both. All three
 * are asserted, because losing one silently is losing a channel.
 *
 * The link is a TRACKED duncit.com link rather than a plain URL, so the signups
 * a member brings in are attributed to their share the same way any other
 * campaign traffic is. A page that handed out the raw origin URL would still
 * work and would still credit nobody.
 *
 * Sharing follows the browser: the native sheet where there is one, the
 * clipboard where there is not, and neither may throw when the person changes
 * their mind — a cancelled share sheet rejects.
 */
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ReferralPage from '..';
import ReferralCodeCard from '../ReferralCodeCard';
import { MY_REFERRAL, type MyReferral } from '../queries';

const testTheme = createTheme();

const REFERRAL: MyReferral = {
  code: 'MEERA50',
  gift_description: '50 coins for both of you',
  coins_per_referral: 50,
  share_message: 'Join me on Duncit with {code} — {link}',
  referred_by_name: 'Vikram N',
  referred: [
    { user_id: 'u-2', full_name: 'Ayesha K', referred_at: '2026-08-01T10:00:00.000Z' },
    { user_id: 'u-3', full_name: 'Rahul S', referred_at: '2026-08-05T10:00:00.000Z' },
  ],
};

const answering = (referral: MyReferral | null = REFERRAL): MockedResponse[] => [
  {
    request: { query: MY_REFERRAL, variables: () => true },
    result: { data: { myReferral: referral } },
    maxUsageCount: Number.POSITIVE_INFINITY,
  },
];

const failing: MockedResponse[] = [
  {
    request: { query: MY_REFERRAL, variables: () => true },
    error: new Error('Referrals are unavailable'),
    maxUsageCount: Number.POSITIVE_INFINITY,
  },
];

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const wrap = (ui: React.ReactNode, mocks: MockedResponse[] = answering()) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <ThemeProvider theme={testTheme}>
        <MemoryRouter>{ui}</MemoryRouter>
      </ThemeProvider>
    </MockedProvider>
  );

let written: string[] = [];

beforeEach(() => {
  written = [];
  Object.defineProperty(globalThis.navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: vi.fn(async (value: string) => {
        written.push(value);
      }),
    },
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('ReferralCodeCard', () => {
  const card = () => {
    const spies = { onCopyCode: vi.fn(), onCopyLink: vi.fn(), onShare: vi.fn() };
    return { spies, ...wrap(<ReferralCodeCard referral={REFERRAL} {...spies} />) };
  };

  it('shows the code itself, which is the part that gets read out loud', () => {
    expect(card().container.textContent).toContain('MEERA50');
  });

  it('offers all three ways out — they travel differently and losing one loses a channel', () => {
    const { container, spies } = card();

    for (const control of container.querySelectorAll<HTMLElement>('button')) {
      fireEvent.click(control);
    }

    expect(spies.onShare).toHaveBeenCalled();
    expect(spies.onCopyCode).toHaveBeenCalled();
    expect(spies.onCopyLink).toHaveBeenCalled();
  });

  it('says what a referral is worth, so the reason to share it is on the card', () => {
    expect(card().container.textContent).toContain('50');
  });
});

describe('ReferralPage', () => {
  it('waits rather than showing an empty code while the query is in flight', () => {
    const { container } = wrap(<ReferralPage />);

    expect(container.querySelector('[role="progressbar"]')).not.toBeNull();
  });

  it('shows the member their code once it arrives', async () => {
    const { container } = wrap(<ReferralPage />);
    await settle();
    await settle();

    expect(container.textContent).toContain('MEERA50');
  });

  it('names who brought THEM in, which is the other half of the scheme', async () => {
    const { container } = wrap(<ReferralPage />);
    await settle();
    await settle();

    expect(container.textContent).toContain('Vikram N');
  });

  it('lists the friends who have joined on this code', async () => {
    const { container } = wrap(<ReferralPage />);
    await settle();
    await settle();

    expect(container.textContent).toContain('Ayesha K');
    expect(container.textContent).toContain('Rahul S');
  });

  it('renders a member who has referred nobody yet without pretending otherwise', async () => {
    const { container } = wrap(
      <ReferralPage />,
      answering({ ...REFERRAL, referred: [], referred_by_name: null })
    );
    await settle();
    await settle();

    expect(container.textContent).toContain('MEERA50');
    expect(container.textContent).not.toContain('Ayesha K');
  });

  it('says so when referrals cannot be read, rather than showing a blank page', async () => {
    const { container } = wrap(<ReferralPage />, failing);
    await settle();
    await settle();

    expect(container.textContent).toContain('Referrals are unavailable');
  });

  it('says so when there is no referral record at all', async () => {
    const { container } = wrap(<ReferralPage />, answering(null));
    await settle();
    await settle();

    expect(container.textContent).not.toBe('');
  });

  it('copies the code and a message carrying it, never an empty string', async () => {
    const { container } = wrap(<ReferralPage />);
    await settle();
    await settle();

    for (const control of container.querySelectorAll<HTMLElement>('button')) {
      fireEvent.click(control);
      await settle();
    }

    expect(written.length).toBeGreaterThan(0);
    expect(written.every((value) => value.length > 0)).toBe(true);
    expect(written.some((value) => value.includes('MEERA50'))).toBe(true);
  });

  it('uses the share sheet where the browser has one', async () => {
    const share = vi.fn(async () => undefined);
    Object.defineProperty(globalThis.navigator, 'share', { configurable: true, value: share });

    const { container } = wrap(<ReferralPage />);
    await settle();
    await settle();

    for (const control of container.querySelectorAll<HTMLElement>('button')) {
      fireEvent.click(control);
      await settle();
    }

    expect(share).toHaveBeenCalled();
    Reflect.deleteProperty(globalThis.navigator, 'share');
  });

  it('does not throw when the person changes their mind — a cancelled share rejects', async () => {
    Object.defineProperty(globalThis.navigator, 'share', {
      configurable: true,
      value: vi.fn(async () => {
        throw new Error('AbortError');
      }),
    });

    const { container } = wrap(<ReferralPage />);
    await settle();
    await settle();

    for (const control of container.querySelectorAll<HTMLElement>('button')) {
      fireEvent.click(control);
      await settle();
    }

    expect(container.textContent).toContain('MEERA50');
    Reflect.deleteProperty(globalThis.navigator, 'share');
  });

  it('survives a browser with no clipboard at all', async () => {
    Object.defineProperty(globalThis.navigator, 'clipboard', { configurable: true, value: undefined });

    const { container } = wrap(<ReferralPage />);
    await settle();
    await settle();

    for (const control of container.querySelectorAll<HTMLElement>('button')) {
      fireEvent.click(control);
      await settle();
    }

    expect(container.textContent).toContain('MEERA50');
  });
});
