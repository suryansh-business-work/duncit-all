/**
 * The three things a host does with a pod's link.
 *
 * The rating form and the media page behave identically, so they are ONE
 * implementation parameterised by which — which means a test that only covers
 * one of them proves nothing about the other. Both are exercised here.
 *
 * The rules worth pinning down: the link the host hands out is the TRACKED one
 * where the surface can mint it, Share and Copy resolve the SAME link, the link
 * rides the last line of `text` and never a `url` field, and a clipboard that
 * refused never toasts "copied".
 */
import type { ReactNode } from 'react';
import { MockedProvider } from '@apollo/client/testing/react';
import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HostPodActionsProvider, type HostPodActionsConfig } from '../src/HostPodActionsProvider';
import { hostActionsConfig, labelsFor } from './host-actions-config';
import { useHostFeedbackLink, useHostPodMediaLink } from '../src/usePodLinkActions';
import { mwebPodMediaLabels } from '@duncit/utils';

const POD = { id: 'DUN-POD-4821', pod_title: 'Sunday Badminton' };
const labels = labelsFor();
const mediaLabels = mwebPodMediaLabels((key) => key);

const FEEDBACK_LINK = 'https://duncit.com/pod/DUN-POD-4821/feedback';
const MEDIA_LINK = 'https://duncit.com/pod/DUN-POD-4821/media';

let clipboard: string[] = [];
let clipboardWorks = true;

const mount = (
  hook: typeof useHostFeedbackLink,
  over: Partial<HostPodActionsConfig> = {},
) => {
  const config = hostActionsConfig(over);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[]}>
      <HostPodActionsProvider {...config}>{children}</HostPodActionsProvider>
    </MockedProvider>
  );
  return { config, ...renderHook(() => hook(), { wrapper }) };
};

beforeEach(() => {
  clipboard = [];
  clipboardWorks = true;
  Object.defineProperty(globalThis.navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: vi.fn(async (text: string) => {
        if (!clipboardWorks) throw new Error('denied');
        clipboard.push(text);
      }),
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  Reflect.deleteProperty(globalThis.navigator, 'share');
});

describe('useHostFeedbackLink', () => {
  it('opens the rating form through the surface, never a URL of its own', () => {
    const onOpenFeedback = vi.fn();
    const { result } = mount(useHostFeedbackLink, { onOpenFeedback });

    act(() => result.current.open(POD));

    expect(onOpenFeedback).toHaveBeenCalledWith(POD.id);
  });

  it('copies the plain link built from the base the surface supplied', async () => {
    const notifySuccess = vi.fn();
    const { result } = mount(useHostFeedbackLink, { notifySuccess });

    await act(async () => {
      await result.current.copy(POD);
    });

    expect(clipboard).toEqual([FEEDBACK_LINK]);
    expect(notifySuccess).toHaveBeenCalledWith(labels.linkCopied);
  });

  // A local build must stay local rather than pointing at production.
  it('builds the link against a local base when that is what the surface gave it', async () => {
    const { result } = mount(useHostFeedbackLink, { linkBaseUrl: 'http://localhost:5173' });

    await act(async () => {
      await result.current.copy(POD);
    });

    expect(clipboard).toEqual(['http://localhost:5173/pod/DUN-POD-4821/feedback']);
  });

  it('hands out the tracked short link where the surface can mint one', async () => {
    const resolveShareUrl = vi.fn().mockResolvedValue('https://duncit.com/aB3xY9Zq');
    const { result } = mount(useHostFeedbackLink, { resolveShareUrl });

    await act(async () => {
      await result.current.copy(POD);
    });

    expect(resolveShareUrl).toHaveBeenCalledWith('POD_FEEDBACK', POD.id, FEEDBACK_LINK);
    expect(clipboard).toEqual(['https://duncit.com/aB3xY9Zq']);
  });

  // A clipboard that refused (insecure origin, unfocused document) must not
  // toast "copied" for something the host will paste and find missing.
  it('reports a refusal rather than claiming the link was copied', async () => {
    clipboardWorks = false;
    const notifySuccess = vi.fn();
    const notifyError = vi.fn();
    const { result } = mount(useHostFeedbackLink, { notifySuccess, notifyError });

    await act(async () => {
      await result.current.copy(POD);
    });

    expect(notifySuccess).not.toHaveBeenCalled();
    expect(notifyError).toHaveBeenCalledWith(labels.copyFailed);
  });

  it('sends the ask and the link together, with the link on the last line', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, 'share', { configurable: true, value: share });
    const { result } = mount(useHostFeedbackLink);

    await act(async () => {
      await result.current.share(POD);
    });

    const [payload] = share.mock.calls[0];
    expect(payload.title).toBe(POD.pod_title);
    expect(payload.text.split('\n').at(-1)).toBe(FEEDBACK_LINK);
    // A `url` field would make targets that accept one drop `text` entirely.
    expect(payload).not.toHaveProperty('url');
  });

  it('resolves the same tracked link for Share as for Copy — one pod, one address', async () => {
    const resolveShareUrl = vi.fn().mockResolvedValue('https://duncit.com/aB3xY9Zq');
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, 'share', { configurable: true, value: share });
    const { result } = mount(useHostFeedbackLink, { resolveShareUrl });

    await act(async () => {
      await result.current.share(POD);
      await result.current.copy(POD);
    });

    expect(share.mock.calls[0][0].text).toContain('https://duncit.com/aB3xY9Zq');
    expect(clipboard).toEqual(['https://duncit.com/aB3xY9Zq']);
  });

  // No share sheet on this browser: the host still pastes the ask, not a naked
  // URL.
  it('copies the whole message when the browser has no share sheet', async () => {
    const notifySuccess = vi.fn();
    const { result } = mount(useHostFeedbackLink, { notifySuccess });

    await act(async () => {
      await result.current.share(POD);
    });

    expect(clipboard[0]).toContain(FEEDBACK_LINK);
    expect(clipboard[0].split('\n')).toHaveLength(2);
    expect(notifySuccess).toHaveBeenCalledWith(labels.linkCopied);
  });

  it('says nothing at all when the host dismissed the share sheet', async () => {
    const share = vi.fn().mockRejectedValue(new Error('AbortError'));
    Object.defineProperty(globalThis.navigator, 'share', { configurable: true, value: share });
    const notifyError = vi.fn();
    const notifySuccess = vi.fn();
    const { result } = mount(useHostFeedbackLink, { notifyError, notifySuccess });

    await act(async () => {
      await result.current.share(POD);
    });

    expect(notifyError).not.toHaveBeenCalled();
    expect(notifySuccess).not.toHaveBeenCalled();
  });
});

describe('useHostPodMediaLink', () => {
  it('opens the media page through the surface that owns the route', () => {
    const onOpenPodMedia = vi.fn();
    const { result } = mount(useHostPodMediaLink, { onOpenPodMedia });

    act(() => result.current.open(POD));

    expect(onOpenPodMedia).toHaveBeenCalledWith(POD.id);
  });

  // A console with no media route of its own omits the menu item, so open()
  // has nothing to call and must not throw.
  it('opens nothing on a surface with no media page', () => {
    const { result } = mount(useHostPodMediaLink, { onOpenPodMedia: undefined });

    expect(() => act(() => result.current.open(POD))).not.toThrow();
  });

  it('copies the media link and toasts in the media wording, not the rating one', async () => {
    const notifySuccess = vi.fn();
    const { result } = mount(useHostPodMediaLink, { notifySuccess });

    await act(async () => {
      await result.current.copy(POD);
    });

    expect(clipboard).toEqual([MEDIA_LINK]);
    expect(notifySuccess).toHaveBeenCalledWith(mediaLabels.linkCopied);
  });

  it('sends the media ask, under its own campaign', async () => {
    const resolveShareUrl = vi.fn().mockResolvedValue('https://duncit.com/mEd1aC0d');
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, 'share', { configurable: true, value: share });
    const { result } = mount(useHostPodMediaLink, { resolveShareUrl });

    await act(async () => {
      await result.current.share(POD);
    });

    expect(resolveShareUrl).toHaveBeenCalledWith('POD_MEDIA', POD.id, MEDIA_LINK);
    expect(share.mock.calls[0][0].text).toContain(mediaLabels.shareMessage(POD.pod_title));
  });
});
