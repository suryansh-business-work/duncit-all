/**
 * The SOS button.
 *
 * This is the one screen in mWeb where a failure is a safety failure, so every
 * rule below is about the button doing what the person believes it did.
 *
 *  - It is disabled until a pod is chosen. An SOS with no pod on it reaches
 *    nobody in particular, and the person has already stopped looking at their
 *    phone by then.
 *  - A location that cannot be read must not stop the send. Permission denied,
 *    no GPS, an indoor fix that never resolves — the alert still has to go, with
 *    a null location rather than none at all. The capture is time-boxed for
 *    exactly that reason.
 *  - A send that FAILED says so. Silence after tapping SOS is indistinguishable
 *    from success, and that is the worst possible outcome here.
 *  - Once one is live the screen stops offering another and reports the state of
 *    the one already out — awaiting response, or acknowledged by the team.
 */
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import SosContent from '../SosContent';
import { MY_ACTIVE_SOS, RAISE_SOS, type SupportPodOption } from '../queries';

const testTheme = createTheme();

const POD: SupportPodOption = {
  membershipId: 'pm-1',
  podDocId: 'pod-1',
  podSlug: 'sunday-badminton',
  title: 'Sunday Badminton',
  startsAt: '2026-08-23T09:00:00.000Z',
  endsAt: '2026-08-23T11:00:00.000Z',
};

const activeSos = (status: 'PENDING' | 'ACKNOWLEDGED' | null): MockedResponse => ({
  request: { query: MY_ACTIVE_SOS, variables: () => true },
  result: {
    data: {
      myActiveBouncerSos: status
        ? {
            id: 'sos-1',
            status,
            message: 'Medical help needed',
            created_at: '2026-08-23T09:30:00.000Z',
            acknowledged_at: status === 'ACKNOWLEDGED' ? '2026-08-23T09:31:00.000Z' : null,
          }
        : null,
    },
  },
  maxUsageCount: Number.POSITIVE_INFINITY,
});

const raiseOk: MockedResponse = {
  request: { query: RAISE_SOS, variables: () => true },
  result: {
    data: {
      raiseBouncerSos: {
        id: 'sos-1',
        status: 'PENDING',
        message: null,
        created_at: '2026-08-23T09:30:00.000Z',
      },
    },
  },
  maxUsageCount: Number.POSITIVE_INFINITY,
};

const raiseFails: MockedResponse = {
  request: { query: RAISE_SOS, variables: () => true },
  error: new Error('The alert could not be sent'),
  maxUsageCount: Number.POSITIVE_INFINITY,
};

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const sos = (selected: SupportPodOption | null, mocks: MockedResponse[] = [activeSos(null), raiseOk]) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <ThemeProvider theme={testTheme}>
        <SosContent selected={selected} />
      </ThemeProvider>
    </MockedProvider>
  );

const sendButton = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLButtonElement>('button')].find((button) =>
    /send sos|sending/i.test(button.textContent ?? '')
  );

/** A geolocation that answers however the test wants it to. */
const geolocation = (behaviour: 'ok' | 'denied' | 'never') => {
  Object.defineProperty(globalThis.navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: (onOk: PositionCallback, onFail: PositionErrorCallback) => {
        if (behaviour === 'ok') {
          onOk({ coords: { latitude: 12.97, longitude: 77.59, accuracy: 12 } } as never);
        }
        if (behaviour === 'denied') {
          onFail({ code: 1, message: 'User denied Geolocation' } as never);
        }
      },
    },
  });
};

beforeEach(() => {
  geolocation('ok');
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('SosContent', () => {
  it('warns before it is tapped, and says what will be shared', () => {
    const { container } = sos(POD);

    expect(container.textContent).toContain('real emergency');
    expect(container.textContent).toContain('location');
  });

  it('will not send without a pod — an SOS with no pod on it reaches nobody', () => {
    const { container } = sos(null);

    expect(sendButton(container)?.disabled).toBe(true);
  });

  it('offers the send once a pod is chosen', async () => {
    const { container } = sos(POD);
    await settle();

    expect(sendButton(container)?.disabled).toBe(false);
  });

  it('takes an optional note, capped so it stays readable at a glance', () => {
    const { container } = sos(POD);
    const note = container.querySelector('textarea') as HTMLTextAreaElement;

    fireEvent.change(note, { target: { value: 'medical help needed' } });

    expect(note.value).toBe('medical help needed');
    expect(note.getAttribute('maxlength')).toBe('500');
  });

  it('sends, and says it sent', async () => {
    const { container } = sos(POD);
    await settle();

    sendButton(container)?.click();
    await settle();
    await settle();

    expect(container.textContent).toContain('SOS sent');
  });

  it('still sends when the location was refused — the alert matters more than the fix', async () => {
    geolocation('denied');
    const { container } = sos(POD);
    await settle();

    sendButton(container)?.click();
    await settle();
    await settle();

    expect(container.textContent).toContain('SOS sent');
  });

  it('still sends on a browser with no geolocation at all', async () => {
    Object.defineProperty(globalThis.navigator, 'geolocation', { configurable: true, value: undefined });
    const { container } = sos(POD);
    await settle();

    sendButton(container)?.click();
    await settle();
    await settle();

    expect(container.textContent).toContain('SOS sent');
  });

  it('says so when the send FAILED — silence here is indistinguishable from success', async () => {
    const { container } = sos(POD, [activeSos(null), raiseFails]);
    await settle();

    sendButton(container)?.click();
    await settle();
    await settle();

    expect(container.textContent).toContain('could not be sent');
  });

  it('lets the person dismiss the failure and try again', async () => {
    const { container } = sos(POD, [activeSos(null), raiseFails]);
    await settle();

    sendButton(container)?.click();
    await settle();
    await settle();

    for (const control of container.querySelectorAll<HTMLElement>('button[aria-label], button[title]')) {
      fireEvent.click(control);
    }
    await settle();

    expect(sendButton(container)).toBeDefined();
  });

  it('stops offering another once one is already out, and says it is awaiting a response', async () => {
    const { container } = sos(POD, [activeSos('PENDING')]);
    await settle();
    await settle();

    expect(container.textContent).toContain('Help is on the way');
    expect(container.textContent).toContain('Awaiting response');
    expect(sendButton(container)).toBeUndefined();
  });

  it('says when the team has acknowledged it, which is a different thing to say', async () => {
    const { container } = sos(POD, [activeSos('ACKNOWLEDGED')]);
    await settle();
    await settle();

    expect(container.textContent).toContain('Acknowledged by team');
  });

  it('clears the note after sending, so the next alert is not the last one repeated', async () => {
    const { container } = sos(POD);
    await settle();
    const note = container.querySelector('textarea') as HTMLTextAreaElement;
    fireEvent.change(note, { target: { value: 'medical help needed' } });

    sendButton(container)?.click();
    await settle();
    await settle();

    expect((container.querySelector('textarea') as HTMLTextAreaElement).value).toBe('');
  });
});
