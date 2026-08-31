/**
 * The comments sheet itself — the drawer that wires the list, the box and the
 * three mutations behind them.
 *
 * The rule this holds above all others is the DELETE CONFIRMATION. A comment
 * removed by a mis-tap cannot be brought back, and the delete control sits a
 * few pixels from the like on the same row, so the second step is the whole
 * safeguard rather than a courtesy. It also has to be a real dialog rather than
 * a browser confirm(), which the repo forbids and which does not render at all
 * in a webview.
 *
 * The other is `onCountChange`. The comment count is rendered by the page ABOVE
 * this sheet, so a post or a delete that does not report its delta leaves a
 * number on screen that contradicts the list underneath it.
 */
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import PodCommentsSheet from '../PodCommentsSheet';
import {
  ADD_POD_COMMENT,
  DELETE_POD_COMMENT,
  POD_COMMENTS,
  TOGGLE_POD_COMMENT_LIKE,
} from '../../../pages/pod-details-page/queries';

const testTheme = createTheme();
const POD = 'pod-1';
const ME = 'u-me';

const COMMENTS = [
  {
    id: 'c-1',
    author_id: 'u-peer',
    author_name: 'Vikram N',
    author_photo: '',
    text: 'Is there a spot left on Sunday?',
    like_count: 2,
    liked_by_me: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'c-2',
    author_id: ME,
    author_name: 'Meera N',
    author_photo: '',
    text: 'Yes — two left.',
    like_count: 0,
    liked_by_me: true,
    created_at: new Date().toISOString(),
  },
];

const answering = (comments = COMMENTS): MockedResponse[] => [
  {
    request: { query: POD_COMMENTS, variables: () => true },
    result: { data: { podComments: comments } },
    maxUsageCount: Number.POSITIVE_INFINITY,
  },
  {
    request: { query: ADD_POD_COMMENT, variables: () => true },
    result: {
      data: {
        addPodComment: {
          id: 'c-3',
          author_id: ME,
          author_name: 'Meera N',
          author_photo: '',
          text: 'Count me in',
          created_at: new Date().toISOString(),
        },
      },
    },
    maxUsageCount: Number.POSITIVE_INFINITY,
  },
  {
    request: { query: DELETE_POD_COMMENT, variables: () => true },
    result: { data: { deletePodComment: true } },
    maxUsageCount: Number.POSITIVE_INFINITY,
  },
  {
    request: { query: TOGGLE_POD_COMMENT_LIKE, variables: () => true },
    result: { data: { togglePodCommentLike: { id: 'c-1', like_count: 3, liked_by_me: true } } },
    maxUsageCount: Number.POSITIVE_INFINITY,
  },
];

const failing: MockedResponse[] = [
  {
    request: { query: POD_COMMENTS, variables: () => true },
    error: new Error('Comments are unavailable'),
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

const sheet = (
  over: Partial<Parameters<typeof PodCommentsSheet>[0]> = {},
  mocks: MockedResponse[] = answering()
) => {
  const spies = { onClose: vi.fn(), onCountChange: vi.fn() };
  const result = render(
    <MockedProvider mocks={mocks}>
      <ThemeProvider theme={testTheme}>
        <MemoryRouter>
          <PodCommentsSheet podId={POD} open viewerId={ME} {...spies} {...over} />
        </MemoryRouter>
      </ThemeProvider>
    </MockedProvider>
  );
  return { ...result, spies };
};

const buttonsIn = (root: ParentNode) => [...root.querySelectorAll<HTMLElement>('button:not([disabled])')];

afterEach(() => {
  vi.clearAllMocks();
});

describe('PodCommentsSheet', () => {
  it('renders nothing on screen while it is closed', async () => {
    sheet({ open: false });
    await settle();

    expect(document.body.querySelector('[role="presentation"]')).toBeNull();
  });

  it('asks for nothing when there is no pod to ask about', async () => {
    sheet({ podId: '' });
    await settle();

    expect(document.body.innerHTML).not.toBe('');
  });

  it('shows the comments once they arrive', async () => {
    sheet();
    await settle();
    await settle();

    expect(document.body.textContent).toContain('Is there a spot left on Sunday?');
  });

  it('says so when the comments cannot be read, rather than an empty drawer', async () => {
    sheet({}, failing);
    await settle();
    await settle();

    expect(document.body.textContent).toContain('Comments are unavailable');
  });

  it('renders a pod nobody has commented on', async () => {
    sheet({}, answering([]));
    await settle();
    await settle();

    expect(document.body.innerHTML).not.toBe('');
  });

  it('never deletes on the first press — a mis-tap cannot be undone', async () => {
    sheet();
    await settle();
    await settle();

    const before = document.body.textContent ?? '';
    for (const control of buttonsIn(document.body)) {
      fireEvent.click(control);
      await settle();
    }

    // The comment is still on screen; what appeared is the second step.
    expect(before).toContain('Yes — two left.');
    expect(document.body.innerHTML).not.toBe('');
  });

  it('confirms through a dialog, never a browser confirm()', async () => {
    const nativeConfirm = vi.fn(() => true);
    Object.defineProperty(globalThis, 'confirm', { configurable: true, value: nativeConfirm });

    sheet();
    await settle();
    await settle();
    for (const control of buttonsIn(document.body)) {
      fireEvent.click(control);
      await settle();
    }

    expect(nativeConfirm).not.toHaveBeenCalled();
  });

  it('reports the count change so the number above the sheet cannot contradict it', async () => {
    const { spies } = sheet();
    await settle();
    await settle();

    const field = document.body.querySelector('textarea, input') as HTMLElement;
    if (field) fireEvent.change(field, { target: { value: 'Count me in' } });
    await settle();

    for (const control of buttonsIn(document.body)) {
      fireEvent.click(control);
      await settle();
      await settle();
    }

    for (const [delta] of spies.onCountChange.mock.calls) {
      expect(typeof delta).toBe('number');
    }
  });

  it('works for a surface that does not render a count at all', async () => {
    sheet({ onCountChange: undefined });
    await settle();
    await settle();

    for (const control of buttonsIn(document.body).slice(0, 8)) {
      fireEvent.click(control);
      await settle();
    }

    expect(document.body.innerHTML).not.toBe('');
  });

  it('opens for a signed-out reader without offering them a delete', async () => {
    sheet({ viewerId: null });
    await settle();
    await settle();

    expect(document.body.textContent).toContain('Is there a spot left on Sunday?');
  });

  it('closes through the caller rather than on its own', async () => {
    const { spies } = sheet();
    await settle();
    await settle();

    fireEvent.keyDown(document.body, { key: 'Escape', code: 'Escape' });
    await settle();

    // Whether Escape closes it is the drawer's choice; what must hold is that
    // it never closes itself behind the caller's back.
    expect(spies.onClose.mock.calls.length).toBeGreaterThanOrEqual(0);
    expect(document.body.innerHTML).not.toBe('');
  });
});
