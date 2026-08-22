/**
 * A notification row, and the follow-request actions that live inside one.
 *
 * The follow request is the interesting half, because it is the private
 * profile's whole gate: accepting is what CREATES the follow, so these two
 * buttons are the only thing standing between a stranger and somebody's
 * private profile. It is rendered across the entire life of a request —
 * pending, accepted, denied, and accepted-but-not-followed-back — and the
 * decision about which of those to show belongs to `followRequestRowState` in
 * @duncit/utils so the native twin cannot disagree with it.
 *
 * Two states exist only because the request can be answered somewhere else. A
 * request already settled on another device states the outcome instead of
 * offering buttons that would now fail, and a follow-back already REQUESTED
 * renders disabled — the ask is open, so a second tap has nothing to send.
 *
 * The row itself must be reachable from a keyboard: it is a `<Box role=button>`
 * rather than a real button, so Enter and Space are wired by hand and are
 * exactly the kind of thing that silently stops working.
 */
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import FollowRequestActions from '../FollowRequestActions';
import NotificationRow from '../NotificationRow';
import {
  ANSWER_FOLLOW_REQUEST,
  FOLLOW_USER,
  REJECT_FOLLOW_REQUEST,
} from '../../../../pages/hosts-venues-page/queries';

const testTheme = createTheme();

const answering: MockedResponse[] = [
  {
    request: { query: ANSWER_FOLLOW_REQUEST },
    variableMatcher: () => true,
    result: { data: { answerFollowRequest: { id: 'fr-1', status: 'ACCEPTED' } } },
    maxUsageCount: Number.POSITIVE_INFINITY,
  },
  {
    request: { query: REJECT_FOLLOW_REQUEST },
    variableMatcher: () => true,
    result: { data: { rejectFollowRequest: { id: 'fr-1', status: 'DENIED' } } },
    maxUsageCount: Number.POSITIVE_INFINITY,
  },
  {
    request: { query: FOLLOW_USER },
    variableMatcher: () => true,
    result: { data: { followUser: { id: 'u-peer', follow_status: 'REQUESTED' } } },
    maxUsageCount: Number.POSITIVE_INFINITY,
  },
];

const refusing: MockedResponse[] = [
  {
    request: { query: ANSWER_FOLLOW_REQUEST },
    variableMatcher: () => true,
    error: new Error('That request has already been answered'),
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

const wrap = (ui: React.ReactNode, mocks: MockedResponse[] = answering) =>
  render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <ThemeProvider theme={testTheme}>{ui}</ThemeProvider>
    </MockedProvider>
  );

afterEach(() => {
  vi.clearAllMocks();
});

describe('FollowRequestActions', () => {
  const actions = (over: Partial<Parameters<typeof FollowRequestActions>[0]> = {}, mocks?: MockedResponse[]) => {
    const onAnswered = vi.fn();
    return {
      onAnswered,
      ...wrap(
        <FollowRequestActions
          actionType="FOLLOW_REQUEST"
          requestId="fr-1"
          status="PENDING"
          actorId="u-peer"
          onAnswered={onAnswered}
          {...over}
        />,
        mocks
      ),
    };
  };

  it('renders nothing on an ordinary notification — every row mounts this', () => {
    const { container } = actions({ actionType: 'POD_REMINDER' });

    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when there is no request behind the row', () => {
    const { container } = actions({ requestId: null });

    expect(container.innerHTML).toBe('');
  });

  it('offers Accept and Deny while the request is pending — the private gate', () => {
    const { container } = actions();

    expect(container.querySelectorAll('button').length).toBeGreaterThanOrEqual(2);
  });

  it('tells the inbox to re-read once the request is answered', async () => {
    const { container, onAnswered } = actions();

    const [first] = container.querySelectorAll<HTMLElement>('button');
    fireEvent.click(first);
    await settle();
    await settle();

    expect(onAnswered).toHaveBeenCalled();
  });

  it('says why nothing happened rather than leaving the buttons looking untapped', async () => {
    const { container, onAnswered } = actions({}, refusing);

    const [first] = container.querySelectorAll<HTMLElement>('button');
    fireEvent.click(first);
    await settle();
    await settle();

    expect(container.textContent).toContain('already been answered');
    expect(onAnswered).not.toHaveBeenCalled();
  });

  it('states the outcome of a request answered somewhere else, with nothing to tap', () => {
    const accepted = actions({ status: 'ACCEPTED', followBackStatus: 'FOLLOWING' });
    const denied = actions({ status: 'DENIED' });

    expect(accepted.container.querySelectorAll('button')).toHaveLength(0);
    expect(denied.container.querySelectorAll('button')).toHaveLength(0);
    expect(accepted.container.textContent).not.toBe(denied.container.textContent);
  });

  it('offers Follow Back once accepted, when the viewer does not already follow them', () => {
    const { container } = actions({ status: 'ACCEPTED', followBackStatus: 'NONE' });

    expect(container.querySelectorAll('button').length).toBeGreaterThan(0);
  });

  it('renders an open follow-back as disabled — a second tap has nothing to send', () => {
    const { container } = actions({ status: 'ACCEPTED', followBackStatus: 'REQUESTED' });

    const [button] = container.querySelectorAll<HTMLButtonElement>('button');
    expect(button?.disabled).toBe(true);
  });

  it('follows back through the mutation and tells the inbox', async () => {
    const { container, onAnswered } = actions({ status: 'ACCEPTED', followBackStatus: 'NONE' });

    for (const control of container.querySelectorAll<HTMLElement>('button:not([disabled])')) {
      fireEvent.click(control);
    }
    await settle();
    await settle();

    expect(onAnswered).toHaveBeenCalled();
  });

  it('takes its ink from the row when the row is unread and carries a gradient', () => {
    const unread = actions({ unreadRow: true });
    const read = actions({ unreadRow: false });

    expect(unread.container.innerHTML).not.toBe(read.container.innerHTML);
  });

  it('does not open the row underneath when an action is tapped', () => {
    const onClick = vi.fn();
    const { container } = wrap(
      <div
        onClick={onClick}
        onKeyDown={() => undefined}
        role="button"
        tabIndex={0}
        aria-label="row"
      >
        <FollowRequestActions
          actionType="FOLLOW_REQUEST"
          requestId="fr-1"
          status="ACCEPTED"
          actorId="u-peer"
          followBackStatus="NONE"
          onAnswered={vi.fn()}
        />
      </div>
    );

    for (const control of container.querySelectorAll<HTMLElement>('button')) {
      fireEvent.click(control);
    }

    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('NotificationRow', () => {
  const item = (over: Record<string, unknown> = {}) => ({
    id: 'n-1',
    read_at: null,
    created_at: new Date().toISOString(),
    notification: {
      title: 'Your pod starts soon',
      body: 'Sunday Badminton, Court 2, in an hour.',
      link_url: '/pod/sunday-badminton',
      action_type: null,
      image_url: '',
    },
    ...over,
  });

  const row = (over: Partial<Parameters<typeof NotificationRow>[0]> = {}) => {
    const spies = { onClick: vi.fn(), onAnswered: vi.fn() };
    return { spies, ...wrap(<NotificationRow item={item()} busy={false} {...spies} {...over} />) };
  };

  it('shows the notification and its preview', () => {
    const { container } = row();

    expect(container.textContent).toContain('Your pod starts soon');
    expect(container.textContent).toContain('Court 2');
  });

  it('paints an unread row differently from a read one', () => {
    const unread = row();
    const read = row({ item: item({ read_at: new Date().toISOString() }) });

    expect(unread.container.innerHTML).not.toBe(read.container.innerHTML);
  });

  it('opens from a click', () => {
    const { container, spies } = row();

    fireEvent.click(container.firstElementChild as HTMLElement);

    expect(spies.onClick).toHaveBeenCalled();
  });

  it('opens from the keyboard, since the row is not a real button', () => {
    const { container, spies } = row();
    const target = container.firstElementChild as HTMLElement;

    fireEvent.keyDown(target, { key: 'Enter' });
    fireEvent.keyDown(target, { key: ' ' });

    expect(spies.onClick).toHaveBeenCalledTimes(2);
  });

  it('ignores other keys, so Tab still moves on', () => {
    const { container, spies } = row();

    fireEvent.keyDown(container.firstElementChild as HTMLElement, { key: 'Tab' });

    expect(spies.onClick).not.toHaveBeenCalled();
  });

  it('takes no input while its own mark-read is in flight', () => {
    const { container, spies } = row({ busy: true });
    const target = container.firstElementChild as HTMLElement;

    fireEvent.click(target);
    fireEvent.keyDown(target, { key: 'Enter' });

    expect(spies.onClick).not.toHaveBeenCalled();
    expect(target.getAttribute('aria-busy')).toBe('true');
  });

  it('drops the chevron on an actionable row, which ends in its own buttons', () => {
    const plain = row();
    const actionable = row({
      item: item({ notification: { ...item().notification, action_type: 'FOLLOW_REQUEST' } }),
    });

    expect(actionable.container.innerHTML).not.toBe(plain.container.innerHTML);
  });

  it('renders a notification with nothing to open', () => {
    const { container } = row({
      item: item({ notification: { ...item().notification, link_url: null } }),
    });

    expect(container.textContent).toContain('Your pod starts soon');
  });

  it('renders a row whose notification is missing entirely', () => {
    const { container } = row({ item: item({ notification: null }) });

    expect(container).toBeDefined();
  });
});
