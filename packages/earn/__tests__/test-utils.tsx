/**
 * Shared harness for the Earn flow suites: an Apollo MockedProvider with the
 * mocks a test hands in, a theme (MUI's `useTheme()` is NULL outside a
 * provider), the MUIX adapter the slot calendar needs, and a surface config
 * whose copy is the translation key itself — the key standing in for a
 * translator, exactly as the form's cy spec does.
 */
import type { ReactElement } from 'react';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { DuncitLocalizationProvider } from '@duncit/app-settings';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { EarnSurfaceProvider, type EarnSurfaceConfig } from '../src/EarnSurfaceProvider';
import { mwebEarnMeetingLabels } from '../src/labels';
import { CANCEL_MY_MEETING, MEETING_SLOTS, RESCHEDULE_MY_MEETING } from '../src/queries';

// MUIX's calendar measures itself; jsdom ships no ResizeObserver.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

export const testTheme = createTheme();

/** The copy every dialog under test renders — asserted on by key. */
export const LABELS = mwebEarnMeetingLabels((key) => key);

export const settle = async () => {
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

export const buildConfig = (over: Partial<EarnSurfaceConfig> = {}): EarnSurfaceConfig =>
  ({
    openJourney: vi.fn(),
    runCta: vi.fn(),
    meetingSlotLabels: () => slotLabels(),
    currentSlotBadge: 'Current',
    meetingLabels: LABELS,
    ...over,
  }) as unknown as EarnSurfaceConfig;

export const wrap = (
  ui: ReactElement,
  mocks: readonly MockedResponse[] = [],
  surface: EarnSurfaceConfig = buildConfig(),
) =>
  render(
    <MockedProvider mocks={mocks}>
      <ThemeProvider theme={testTheme}>
        <DuncitLocalizationProvider>
          <EarnSurfaceProvider config={surface}>{ui}</EarnSurfaceProvider>
        </DuncitLocalizationProvider>
      </ThemeProvider>
    </MockedProvider>,
  );

/** Three slots on one day, mid-day UTC so no zone shifts them across a date. */
export const SLOT_OPEN = '2026-09-02T10:00:00.000Z';
export const SLOT_CURRENT = '2026-09-02T12:00:00.000Z';
export const SLOT_TAKEN = '2026-09-02T14:00:00.000Z';

const slot = (start_at: string, available: boolean) => ({
  start_at,
  end_at: new Date(new Date(start_at).getTime() + 30 * 60_000).toISOString(),
  available,
  __typename: 'MeetingSlot',
});

export const meetingSlotsMock = (kind = 'HOST'): MockedResponse => ({
  request: { query: MEETING_SLOTS, variables: { kind } },
  result: {
    data: { meetingSlots: [slot(SLOT_OPEN, true), slot(SLOT_CURRENT, true), slot(SLOT_TAKEN, false)] },
  },
});

export const rescheduleMock = (
  reason: string,
  over: Partial<MockedResponse> = {},
): MockedResponse => ({
  request: {
    query: RESCHEDULE_MY_MEETING,
    variables: { kind: 'HOST', requested_at: SLOT_OPEN, reason },
  },
  result: {
    data: {
      rescheduleMyMeeting: {
        id: 'DUN-MTG-4821',
        requested_at: SLOT_OPEN,
        status: 'REQUESTED',
        reschedule_count: 1,
        __typename: 'OnboardingMeeting',
      },
    },
  },
  ...over,
});

export const cancelMock = (
  reason: string,
  kind = 'HOST',
  over: Partial<MockedResponse> = {},
): MockedResponse => ({
  request: { query: CANCEL_MY_MEETING, variables: { kind, reason } },
  result: {
    data: { cancelMyMeeting: { id: 'DUN-MTG-4821', status: 'CANCELLED', __typename: 'OnboardingMeeting' } },
  },
  ...over,
});

/** Type into the mandatory-reason field and submit its form by id. */
export const submitReason = async (formId: string, reason: string) => {
  const form = document.getElementById(formId);
  if (!form) throw new Error(`no form #${formId} in the document`);
  const field = form.querySelector('textarea[name="reason"]');
  if (!field) throw new Error(`no reason field in #${formId}`);
  fireEvent.change(field, { target: { value: reason } });
  fireEvent.submit(form);
  await settle();
};

export const pressEscape = async () => {
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  await settle();
};

export const tile = (startAt: string) => {
  const found = document.querySelector<HTMLElement>(`[data-testid="slot-tile-${startAt}"]`);
  if (!found) throw new Error(`no tile for ${startAt}`);
  return found;
};
