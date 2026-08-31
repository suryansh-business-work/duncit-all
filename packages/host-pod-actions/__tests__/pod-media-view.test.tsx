/**
 * The Upload Pod Media page.
 *
 * ONE view for the host and for a guest who followed the link — they may do
 * exactly the same thing, and only the server decides whose media each of them
 * may take back down. The link is pasted into group chats, so it will reach
 * people who were not there: those get the reason, not a picker.
 *
 * The field is a STAGING AREA, never the store — whatever is picked is sent to
 * the pod and the field goes back to empty, so the grid below is always the one
 * true answer to "what is on this pod".
 */
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { mwebPodMediaLabels } from '@duncit/utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import PodMediaView from '../src/pod-media/PodMediaView';
import PodMediaGrid from '../src/pod-media/PodMediaGrid';
import PodMediaShareCard from '../src/pod-media/PodMediaShareCard';
import { HostPodActionsProvider } from '../src/HostPodActionsProvider';
import {
  ADD_POD_PARTY_MEDIA,
  POD_MEDIA_BOARD,
  REMOVE_POD_PARTY_MEDIA,
} from '../src/pod-media/queries';
import { hostActionsConfig } from './host-actions-config';

const POD_ID = 'pod-1';
const PHOTO = 'https://ik.imagekit.io/duncit/pod-media/a.jpg';
const CLIP = 'https://ik.imagekit.io/duncit/pod-media/b.mp4';

const labels = mwebPodMediaLabels((key: string, options?: { vars?: Record<string, string | number> }) => {
  const vars = Object.values(options?.vars ?? {});
  return vars.length ? `${key} ${vars.join(' ')}` : key;
});

const testTheme = createTheme();

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const item = (over: Record<string, unknown> = {}) => ({
  __typename: 'PodMediaItem',
  url: PHOTO,
  type: 'IMAGE',
  source: 'HOST',
  uploaded_by_id: 'u-1',
  uploaded_by_name: 'Asha Rao',
  uploaded_at: '2026-08-30T14:00:00.000Z',
  mine: true,
  can_remove: true,
  ...over,
});

const board = (over: Record<string, unknown> = {}) => ({
  __typename: 'PodMediaBoard',
  pod_id: 'DUN-POD-4821',
  pod_title: 'Sunday Badminton',
  pod_date_time: '2026-08-30T12:30:00.000Z',
  viewer: 'HOST',
  can_upload: true,
  is_cancelled: false,
  count: 1,
  items: [item()],
  ...over,
});

const boardMock = (over: Record<string, unknown> = {}): MockedResponse => ({
  request: { query: POD_MEDIA_BOARD, variables: { pod_doc_id: POD_ID } },
  result: { data: { podMediaBoard: board(over) } },
  maxUsageCount: Number.POSITIVE_INFINITY,
});

const mount = (mocks: readonly MockedResponse[] = [boardMock()], config = {}) =>
  render(
    <MockedProvider mocks={[...mocks]}>
      <ThemeProvider theme={testTheme}>
        <HostPodActionsProvider {...hostActionsConfig({ podMediaLabels: labels, ...config })}>
          <PodMediaView podId={POD_ID} />
        </HostPodActionsProvider>
      </ThemeProvider>
    </MockedProvider>
  );

afterEach(() => {
  vi.clearAllMocks();
});

describe('PodMediaView', () => {
  it('waits on the board rather than showing an empty page', () => {
    const { container } = mount();

    expect(container.querySelector('[role="progressbar"]')).not.toBeNull();
  });

  it('names the pod and tells the host what the page is for', async () => {
    mount();
    await settle();

    expect(screen.getByText('Sunday Badminton')).toBeInTheDocument();
    expect(screen.getByText(labels.hostIntro)).toBeInTheDocument();
    expect(screen.getByText(labels.itemsHeading(1))).toBeInTheDocument();
  });

  it('words the intro for a guest who followed the link', async () => {
    mount([boardMock({ viewer: 'GUEST' })]);
    await settle();

    expect(screen.getByText(labels.guestIntro)).toBeInTheDocument();
    // Only the host hands the link out — a guest already has it.
    expect(screen.queryByText(labels.shareHeading)).not.toBeInTheDocument();
  });

  // The link reaches people who were not there.
  it('says why there is no picker for somebody the server did not recognise', async () => {
    mount([boardMock({ viewer: 'NONE', can_upload: false })]);
    await settle();

    expect(screen.getByText(labels.notInvited)).toBeInTheDocument();
    expect(screen.queryByLabelText('media')).not.toBeInTheDocument();
  });

  it('says the pod was cancelled, above whatever is still on it', async () => {
    mount([boardMock({ is_cancelled: true })]);
    await settle();

    expect(screen.getByText(labels.cancelled)).toBeInTheDocument();
  });

  it('offers a retry rather than a blank page when the board could not be read', async () => {
    const refetchable: MockedResponse[] = [
      {
        request: { query: POD_MEDIA_BOARD, variables: { pod_doc_id: POD_ID } },
        error: new Error('offline'),
        maxUsageCount: Number.POSITIVE_INFINITY,
      },
    ];
    mount(refetchable);
    await settle();

    expect(screen.getByText(labels.loadFailed)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: labels.retry }));
    await settle();

    expect(screen.getByText(labels.loadFailed)).toBeInTheDocument();
  });

  it('sends what was picked to the pod and empties the field', async () => {
    const added = board({ count: 2, items: [item(), item({ url: CLIP, type: 'VIDEO' })] });
    const notifySuccess = vi.fn();
    mount(
      [
        boardMock(),
        {
          request: {
            query: ADD_POD_PARTY_MEDIA,
            variables: { pod_doc_id: POD_ID, media: [{ url: CLIP }] },
          },
          result: { data: { addPodPartyMedia: added } },
        },
      ],
      { notifySuccess },
    );
    await settle();

    fireEvent.change(screen.getByLabelText('media'), { target: { value: CLIP } });
    await settle();
    await settle();

    expect(notifySuccess).toHaveBeenCalledWith(labels.added(1));
    expect(screen.getByLabelText('media')).toHaveValue('');
  });

  it('sends nothing when the picker reported no usable URL', async () => {
    const notifySuccess = vi.fn();
    mount([boardMock()], { notifySuccess });
    await settle();

    fireEvent.change(screen.getByLabelText('media'), { target: { value: '   \n  ' } });
    await settle();

    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('states the reason when the pod refused what was sent', async () => {
    const notifyError = vi.fn();
    mount(
      [
        boardMock(),
        {
          request: {
            query: ADD_POD_PARTY_MEDIA,
            variables: { pod_doc_id: POD_ID, media: [{ url: CLIP }] },
          },
          error: new Error('That pod is closed to uploads'),
        },
      ],
      { notifyError },
    );
    await settle();

    fireEvent.change(screen.getByLabelText('media'), { target: { value: CLIP } });
    await settle();
    await settle();

    expect(notifyError).toHaveBeenCalledWith('That pod is closed to uploads');
  });

  it('takes a row back down and says so', async () => {
    const notifySuccess = vi.fn();
    mount(
      [
        boardMock(),
        {
          request: { query: REMOVE_POD_PARTY_MEDIA, variables: { pod_doc_id: POD_ID, url: PHOTO } },
          result: { data: { removePodPartyMedia: board({ count: 0, items: [] }) } },
        },
      ],
      { notifySuccess },
    );
    await settle();

    fireEvent.click(screen.getByRole('button', { name: labels.remove }));
    await settle();
    await settle();

    expect(notifySuccess).toHaveBeenCalledWith(labels.removed);
  });

  it('states the reason when a row could not be taken down', async () => {
    const notifyError = vi.fn();
    mount(
      [
        boardMock(),
        {
          request: { query: REMOVE_POD_PARTY_MEDIA, variables: { pod_doc_id: POD_ID, url: PHOTO } },
          error: new Error('Somebody else owns that photo'),
        },
      ],
      { notifyError },
    );
    await settle();

    fireEvent.click(screen.getByRole('button', { name: labels.remove }));
    await settle();
    await settle();

    expect(notifyError).toHaveBeenCalledWith('Somebody else owns that photo');
  });

  it('offers no remove at all to a viewer who may not upload', async () => {
    mount([boardMock({ can_upload: false, viewer: 'GUEST' })]);
    await settle();

    expect(screen.queryByRole('button', { name: labels.remove })).not.toBeInTheDocument();
  });
});

describe('PodMediaGrid', () => {
  const grid = (over: Record<string, unknown> = {}) =>
    render(
      <ThemeProvider theme={testTheme}>
        <PodMediaGrid items={[item()]} labels={labels} {...(over as never)} />
      </ThemeProvider>
    );

  it('says there is nothing on the pod yet rather than drawing an empty grid', () => {
    grid({ items: [] });

    expect(screen.getByText(labels.empty)).toBeInTheDocument();
  });

  // A host looking at forty photos after an evening is deciding whose to keep.
  it('says who added each one, and whether they were the host', () => {
    grid({
      items: [item(), item({ url: CLIP, source: 'GUEST', uploaded_by_name: 'Vikram S' })],
    });

    expect(screen.getByText(labels.byHost)).toBeInTheDocument();
    expect(screen.getByText(labels.byGuest)).toBeInTheDocument();
    expect(screen.getByText('Asha Rao')).toBeInTheDocument();
    expect(screen.getByText('Vikram S')).toBeInTheDocument();
  });

  it('plays a clip inline rather than drawing it as a broken picture', () => {
    const { container } = grid({ items: [item({ url: CLIP, type: 'VIDEO' })] });

    expect(container.querySelector('video')).not.toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });

  it('offers the remove only on the rows the server says this viewer owns', () => {
    const onRemove = vi.fn();
    grid({
      items: [item(), item({ url: CLIP, can_remove: false, uploaded_by_name: 'Vikram S' })],
      onRemove,
    });

    const buttons = screen.getAllByRole('button', { name: labels.remove });
    expect(buttons).toHaveLength(1);
    fireEvent.click(buttons[0]);
    expect(onRemove).toHaveBeenCalledWith(PHOTO);
  });

  // The Complete dialog shows the strip, it does not edit it.
  it('renders read-only when the caller passed no remove at all', () => {
    grid();

    expect(screen.queryByRole('button', { name: labels.remove })).not.toBeInTheDocument();
  });

  it('locks the removes while a write is in flight', () => {
    grid({ onRemove: vi.fn(), busy: true });

    expect(screen.getByRole('button', { name: labels.remove })).toBeDisabled();
  });
});

describe('PodMediaShareCard', () => {
  const card = (config = {}) =>
    render(
      <MockedProvider mocks={[]}>
        <ThemeProvider theme={testTheme}>
          <HostPodActionsProvider {...hostActionsConfig({ podMediaLabels: labels, ...config })}>
            <PodMediaShareCard podId="DUN-POD-4821" podTitle="Sunday Badminton" />
          </HostPodActionsProvider>
        </ThemeProvider>
      </MockedProvider>
    );

  it('explains what the link is for, and offers both ways to hand it out', () => {
    card();

    expect(screen.getByText(labels.shareHeading)).toBeInTheDocument();
    expect(screen.getByText(labels.shareBody)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: labels.shareLink })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: labels.copyLink })).toBeInTheDocument();
  });

  // The SAME link the pod's menu hands out — one address per pod.
  it('resolves the media link through the shared resolver on both buttons', async () => {
    const resolveShareUrl = vi.fn().mockResolvedValue('https://duncit.com/mEd1aC0d');
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    card({ resolveShareUrl });

    fireEvent.click(screen.getByRole('button', { name: labels.copyLink }));
    await settle();

    expect(resolveShareUrl).toHaveBeenCalledWith(
      'POD_MEDIA',
      'DUN-POD-4821',
      'https://duncit.com/pod/DUN-POD-4821/media',
    );
  });

  // A dismissed share sheet rejects on iOS — that is the host closing it.
  it('says nothing when the host dismissed the share sheet', async () => {
    const share = vi.fn().mockRejectedValue(new Error('AbortError'));
    Object.defineProperty(globalThis.navigator, 'share', { configurable: true, value: share });
    const notifyError = vi.fn();
    card({ notifyError });

    fireEvent.click(screen.getByRole('button', { name: labels.shareLink }));
    await settle();

    expect(share).toHaveBeenCalled();
    expect(notifyError).not.toHaveBeenCalled();
    Reflect.deleteProperty(globalThis.navigator, 'share');
    cleanup();
  });
});
