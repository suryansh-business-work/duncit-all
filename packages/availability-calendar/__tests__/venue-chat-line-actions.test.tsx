import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { act, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import { gql } from '@apollo/client';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import {
  DELETE_VENUE_CHAT_MESSAGE_SDL,
  EDIT_VENUE_CHAT_MESSAGE_SDL,
  MARK_VENUE_CHAT_READ_SDL,
  REACT_TO_VENUE_CHAT_MESSAGE_SDL,
  type VenueChatLine,
} from '@duncit/utils';
import { useMarkReadWhileVisible } from '../src/offers/chat/useMarkReadWhileVisible';
import { useVenueChatLineActions, type VenueChatLineActions } from '../src/offers/chat/useVenueChatLineActions';
import VenueChatLineDialogs from '../src/offers/chat/VenueChatLineDialogs';
import { SETTLED, failWith, mockOf, type Vars } from './offer-fixtures';

const warn = vi.hoisted(() => vi.fn());
vi.mock('@duncit/logs', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn, error: vi.fn() }),
}));

// gql caches by source, so these are the very documents the hook sends.
const REACT = gql(REACT_TO_VENUE_CHAT_MESSAGE_SDL);
const EDIT = gql(EDIT_VENUE_CHAT_MESSAGE_SDL);
const DELETE = gql(DELETE_VENUE_CHAT_MESSAGE_SDL);
const MARK_READ = gql(MARK_VENUE_CHAT_READ_SDL);

/** A text line as the server answers it, with every field the operations select. */
const makeLine = (over: Partial<VenueChatLine> = {}): VenueChatLine =>
  ({
    __typename: 'PodMessage',
    id: 'm1',
    pod_id: 'pod-1',
    user_id: 'u-me',
    user_name: 'Asha',
    user_photo: null,
    type: 'TEXT',
    text: 'See you at 6',
    image_url: null,
    deleted: false,
    createdAt: '2026-12-01T06:30:00.000Z',
    edited_at: null,
    reactions: [],
    offer: null,
    ...over,
  }) as VenueChatLine;

/** A refusal with no words of its own (a dropped connection). */
const wordless = (query: MockedResponse['request']['query']): MockedResponse => ({
  request: { query, variables: () => true },
  error: new Error(''),
});

function setup(mocks: MockedResponse[]) {
  const onLine = vi.fn();
  const onRemoved = vi.fn();
  const onError = vi.fn();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      {children}
    </MockedProvider>
  );
  const hook = renderHook(() => useVenueChatLineActions({ onLine, onRemoved, onError }), { wrapper });
  return { hook, onLine, onRemoved, onError };
}

describe('useVenueChatLineActions', () => {
  beforeEach(() => warn.mockClear());

  it('reacts to a line and puts it back as everyone now sees it', async () => {
    const sent: Vars[] = [];
    const like = { __typename: 'PodMessageReaction', user_id: 'u-me', emoji: '👍' };
    const reacted = makeLine({ reactions: [like] });
    const { hook, onLine, onError } = setup([mockOf(REACT, () => ({ data: { reactToVenueChatMessage: reacted } }), sent)]);
    await act(() => hook.result.current.react('m1', '👍'));
    expect(sent).toEqual([{ message_id: 'm1', emoji: '👍' }]);
    expect(onLine).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1', reactions: [expect.objectContaining({ user_id: 'u-me', emoji: '👍' })] }));
    expect(onError).not.toHaveBeenCalled();
  });

  it("says why a reaction was refused, in the server's words", async () => {
    const { hook, onLine, onError } = setup([mockOf(REACT, failWith('This line was removed'))]);
    await act(() => hook.result.current.react('m1', '👍'));
    expect(onError).toHaveBeenCalledWith('This line was removed');
    expect(onLine).not.toHaveBeenCalled();
  });

  it('puts nothing in place when the server answers no line', async () => {
    const { hook, onLine, onError } = setup([mockOf(REACT, () => ({ data: null })), mockOf(EDIT, () => ({ data: null }))]);
    await act(() => hook.result.current.react('m1', '👍'));
    let saved = false;
    await act(async () => {
      saved = await hook.result.current.edit('m1', 'See you at 7');
    });
    expect(saved).toBe(true);
    expect(onLine).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it('rewrites a line, puts the edited line in place and resolves true', async () => {
    const sent: Vars[] = [];
    const edited = makeLine({ text: 'See you at 7', edited_at: '2026-12-01T06:40:00.000Z' });
    const { hook, onLine } = setup([mockOf(EDIT, () => ({ data: { editVenueChatMessage: edited } }), sent)]);
    let saved = false;
    await act(async () => {
      saved = await hook.result.current.edit('m1', 'See you at 7');
    });
    expect(saved).toBe(true);
    expect(sent).toEqual([{ message_id: 'm1', text: 'See you at 7' }]);
    expect(onLine).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1', text: 'See you at 7', edited_at: '2026-12-01T06:40:00.000Z' }));
  });

  it('resolves false and says why when the rewrite is refused', async () => {
    const { hook, onLine, onError } = setup([mockOf(EDIT, failWith('Only your own text lines can be edited'))]);
    let saved = true;
    await act(async () => {
      saved = await hook.result.current.edit('m1', 'See you at 7');
    });
    expect(saved).toBe(false);
    expect(onError).toHaveBeenCalledWith('Only your own text lines can be edited');
    expect(onLine).not.toHaveBeenCalled();
  });

  it('takes a line back for both sides and resolves true', async () => {
    const sent: Vars[] = [];
    const { hook, onRemoved } = setup([mockOf(DELETE, () => ({ data: { deleteVenueChatMessage: true } }), sent)]);
    let removed = false;
    await act(async () => {
      removed = await hook.result.current.remove('m1');
    });
    expect(removed).toBe(true);
    expect(sent).toEqual([{ message_id: 'm1' }]);
    expect(onRemoved).toHaveBeenCalledWith('m1');
  });

  it('keeps the line and says the change did not go through when the removal fails without a reason', async () => {
    const { hook, onRemoved, onError } = setup([wordless(DELETE)]);
    let removed = true;
    await act(async () => {
      removed = await hook.result.current.remove('m1');
    });
    expect(removed).toBe(false);
    expect(onError).toHaveBeenCalledWith('That did not go through. Please try again.');
    expect(onRemoved).not.toHaveBeenCalled();
  });

  it('is busy while a rewrite is on its way', async () => {
    const { hook } = setup([mockOf(EDIT, () => ({ data: { editVenueChatMessage: makeLine() } }))]);
    expect(hook.result.current.busy).toBe(false);
    let pending: Promise<boolean> = Promise.resolve(false);
    act(() => {
      pending = hook.result.current.edit('m1', 'See you at 7');
    });
    expect(hook.result.current.busy).toBe(true);
    await act(async () => {
      await pending;
    });
    await waitFor(() => expect(hook.result.current.busy).toBe(false), SETTLED);
  });

  it('marks the thread read, and only logs a mark that does not land', async () => {
    const sent: Vars[] = [];
    const ok = setup([mockOf(MARK_READ, () => ({ data: { markVenueChatRead: true } }), sent)]);
    await act(() => ok.hook.result.current.markRead('pod-1'));
    expect(sent).toEqual([{ pod_id: 'pod-1' }]);
    expect(warn).not.toHaveBeenCalled();

    const refused = setup([mockOf(MARK_READ, failWith('Not a member of this chat'))]);
    await act(() => refused.hook.result.current.markRead('pod-1'));
    expect(warn).toHaveBeenCalledWith('venueChat', 'markRead', expect.objectContaining({ pod_id: 'pod-1' }));
    expect(refused.onError).not.toHaveBeenCalled();
  });

  it('keeps one markRead across renders, so an effect can list it', () => {
    const { hook } = setup([]);
    const first = hook.result.current.markRead;
    hook.rerender();
    expect(hook.result.current.markRead).toBe(first);
  });
});

/** Lets every pending promise continuation run, so "not called" means not called. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

type DialogActions = Pick<VenueChatLineActions, 'edit' | 'remove' | 'busy'>;

const actionsOf = (over: Partial<DialogActions> = {}): DialogActions => ({
  edit: vi.fn().mockResolvedValue(true),
  remove: vi.fn().mockResolvedValue(true),
  busy: false,
  ...over,
});

const renderDialogs = (props: {
  editing?: { id: string; text: string } | null;
  deletingId?: string | null;
  actions?: DialogActions;
  error?: string | null;
}) => {
  const onClose = vi.fn();
  const actions = props.actions ?? actionsOf();
  const view = render(
    <VenueChatLineDialogs editing={props.editing ?? null} deletingId={props.deletingId ?? null} actions={actions} error={props.error} onClose={onClose} />,
  );
  return { onClose, actions, view };
};

describe('VenueChatLineDialogs', () => {
  const editing = { id: 'm1', text: 'See you at 6' };
  const editDialog = () => within(screen.getByRole('dialog', { name: 'Edit message' }));

  it('asks nothing while no line is being changed', () => {
    const { view } = renderDialogs({});
    expect(view.container).toBeEmptyDOMElement();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('rewrites the line from its current words, trimmed, and closes once the change is in', async () => {
    const { onClose, actions } = renderDialogs({ editing });
    const box = editDialog().getByRole('textbox', { name: 'Edit message' });
    expect(box).toHaveValue('See you at 6');
    fireEvent.change(box, { target: { value: '  See you at 7  ' } });
    fireEvent.click(editDialog().getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(actions.edit).toHaveBeenCalledWith('m1', 'See you at 7');
  });

  it('stays open when the rewrite does not go through', async () => {
    const { onClose, actions } = renderDialogs({ editing, actions: actionsOf({ edit: vi.fn().mockResolvedValue(false) }) });
    fireEvent.click(editDialog().getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(actions.edit).toHaveBeenCalledTimes(1));
    await settle();
    expect(onClose).not.toHaveBeenCalled();
    expect(editDialog().getByRole('textbox')).toBeInTheDocument();
  });

  it('shows why the last change was refused inside the open edit dialog, where the reader is', () => {
    renderDialogs({ editing, error: 'You can only change your own messages' });
    expect(editDialog().getByRole('alert')).toHaveTextContent('You can only change your own messages');
    expect(editDialog().getByRole('textbox')).toHaveValue('See you at 6');
  });

  it('shows why a delete was refused inside the open confirmation', () => {
    renderDialogs({ deletingId: 'm1', error: 'This message is no longer in the chat' });
    const confirm = within(screen.getByRole('dialog', { name: 'Delete this message?' }));
    expect(confirm.getByText('It is removed from the chat for both sides.')).toBeInTheDocument();
    expect(confirm.getByRole('alert')).toHaveTextContent('This message is no longer in the chat');
  });

  it('asks for something to say before sending', async () => {
    const { actions } = renderDialogs({ editing });
    fireEvent.change(editDialog().getByRole('textbox'), { target: { value: '   ' } });
    fireEvent.click(editDialog().getByRole('button', { name: 'Save' }));
    expect(await editDialog().findByText('Write something first')).toBeInTheDocument();
    expect(actions.edit).not.toHaveBeenCalled();
  });

  it('closes on Cancel or Escape while nothing is on its way', () => {
    const { onClose } = renderDialogs({ editing });
    fireEvent.click(editDialog().getByRole('button', { name: 'Cancel' }));
    fireEvent.keyDown(editDialog().getByRole('textbox'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('cannot be dismissed while the change is on its way', () => {
    const { onClose } = renderDialogs({ editing, actions: actionsOf({ busy: true }) });
    expect(editDialog().getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(editDialog().getByTestId('venue-chat-edit-save')).toBeDisabled();
    fireEvent.keyDown(editDialog().getByRole('textbox'), { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('takes a line back after asking, and closes once it is gone', async () => {
    const { onClose, actions } = renderDialogs({ deletingId: 'm2' });
    const question = within(screen.getByRole('dialog', { name: 'Delete this message?' }));
    expect(question.getByText('It is removed from the chat for both sides.')).toBeInTheDocument();
    fireEvent.click(question.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(actions.remove).toHaveBeenCalledWith('m2');
  });

  it('keeps the question open when the removal fails', async () => {
    const { onClose, actions } = renderDialogs({ deletingId: 'm2', actions: actionsOf({ remove: vi.fn().mockResolvedValue(false) }) });
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(actions.remove).toHaveBeenCalledTimes(1));
    await settle();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Delete this message?' })).toBeInTheDocument();
  });

  it('lets the reader back out of a removal', () => {
    const { onClose, actions } = renderDialogs({ deletingId: 'm2' });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(actions.remove).not.toHaveBeenCalled();
  });
});

type Line = Pick<VenueChatLine, 'id' | 'user_id'>;
const lineFrom = (id: string, user_id: string): Line => ({ id, user_id });

describe('useMarkReadWhileVisible', () => {
  let visibility: DocumentVisibilityState = 'visible';
  let visibilitySpy: { mockRestore: () => void } | undefined;
  const markRead = vi.fn<(podId: string) => Promise<void>>();

  beforeEach(() => {
    visibility = 'visible';
    markRead.mockReset().mockResolvedValue(undefined);
    visibilitySpy = vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
  });

  afterEach(() => {
    visibilitySpy?.mockRestore();
  });

  const follow = (lines: Line[]) =>
    renderHook(({ shown }: { shown: Line[] }) => useMarkReadWhileVisible('pod-1', shown, 'u-me', markRead), { initialProps: { shown: lines } });

  const tabBecomes = (state: DocumentVisibilityState) => {
    visibility = state;
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
  };

  it("marks the thread read when it opens on the other side's line and the tab is in view", () => {
    follow([lineFrom('m1', 'u-me'), lineFrom('m2', 'u-venue')]);
    expect(markRead).toHaveBeenCalledTimes(1);
    expect(markRead).toHaveBeenCalledWith('pod-1');
  });

  it("marks nothing for an empty thread, or one that ends on the reader's own line", () => {
    const hook = follow([]);
    hook.rerender({ shown: [lineFrom('m1', 'u-me')] });
    expect(markRead).not.toHaveBeenCalled();
  });

  it('marks again only when a newer line arrives from the other side', () => {
    const first = [lineFrom('m1', 'u-venue')];
    const hook = follow(first);
    expect(markRead).toHaveBeenCalledTimes(1);
    hook.rerender({ shown: [...first] });
    hook.rerender({ shown: [...first, lineFrom('m2', 'u-me')] });
    expect(markRead).toHaveBeenCalledTimes(1);
    hook.rerender({ shown: [...first, lineFrom('m2', 'u-me'), lineFrom('m3', 'u-venue')] });
    expect(markRead).toHaveBeenCalledTimes(2);
  });

  it('waits for a hidden tab to come back before marking, and marks each time it does', () => {
    visibility = 'hidden';
    follow([lineFrom('m1', 'u-venue')]);
    expect(markRead).not.toHaveBeenCalled();
    tabBecomes('hidden');
    expect(markRead).not.toHaveBeenCalled();
    tabBecomes('visible');
    expect(markRead).toHaveBeenCalledTimes(1);
    tabBecomes('hidden');
    tabBecomes('visible');
    expect(markRead).toHaveBeenCalledTimes(2);
  });

  it('stops listening once the thread is closed', () => {
    visibility = 'hidden';
    const hook = follow([lineFrom('m1', 'u-venue')]);
    hook.unmount();
    tabBecomes('visible');
    expect(markRead).not.toHaveBeenCalled();
  });
});
