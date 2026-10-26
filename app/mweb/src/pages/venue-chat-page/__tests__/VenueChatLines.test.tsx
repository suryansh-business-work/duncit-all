/**
 * What a member does to a venue thread's lines once they are in: the message
 * menu (react to any line, edit or delete their own), the reaction picker on a
 * bubble and on an offer card, the "seen" faces under the line each other member
 * has read to, and the read mark that tells the other side.
 */
import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { describe, expect, it, vi } from 'vitest';
import type { VenueChatReadMark } from '@duncit/utils';
import VenueChatPage from '..';
import {
  at,
  deleteMock,
  editMock,
  line,
  linesMock,
  liveOffer,
  markReadMock,
  myLine,
  offerLine,
  offerMock,
  reactMock,
  readMark,
  roomMock,
} from './fixtures';

vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useParams: () => ({ podId: 'pod-1' }),
  useNavigate: () => vi.fn(),
}));

const socket = vi.hoisted(() => ({ onRead: null as null | ((mark: VenueChatReadMark) => void) }));
vi.mock('../useVenueChatSocket', () => ({
  useVenueChatSocket: (params: { onRead: (mark: VenueChatReadMark) => void }) => {
    socket.onRead = params.onRead;
  },
}));

vi.mock('../../../user-info/useUserInfo', () => ({ useUserInfo: () => ({ me: { user_id: 'u-host' } }) }));
vi.mock('../../host-manage-page/HostPodActionsBridge', () => ({ default: ({ children }: { children: unknown }) => children }));
vi.mock('../../../components/MediaPickerDialog', () => ({ default: () => null }));

const FAILED = 'That did not go through. Please try again.';

const renderPage = (lines: object[], extra: MockedResponse[] = [], room = roomMock('HOST')) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[room, linesMock(lines), offerMock(null), markReadMock(), ...extra]}>
      <VenueChatPage />
    </MockedProvider>,
  );

const fromVenue = line('t1');
const mineText = myLine('t2', 1, { text: 'See you at 7' });
const minePhoto = myLine('p1', 2, { type: 'IMAGE', text: '', image_url: 'https://img.test/hall.jpg' });

const openMenu = (id: string) => fireEvent.click(screen.getByTestId(`chat-message-more-${id}`));
const menuItems = () => within(screen.getByRole('menu')).getAllByRole('menuitem').map((item) => item.textContent);
const bubble = (id: string) => within(screen.getByTestId(`chat-message-${id}`));
const errorBanner = () => screen.findByTestId('venue-chat-error');

describe('VenueChatPage — the message menu', () => {
  it('offers React on every line, Edit and Delete on the reader’s own text, Delete alone on their photo — never Reply or Report', async () => {
    renderPage([fromVenue, mineText, minePhoto]);
    await screen.findByText('See you at 7');

    openMenu('t1');
    expect(menuItems()).toEqual(['React']);

    openMenu('t2');
    expect(menuItems()).toEqual(['React', 'Edit message', 'Delete message']);

    openMenu('p1');
    expect(menuItems()).toEqual(['React', 'Delete message']);
    expect(screen.queryByTestId('chat-message-action-report')).not.toBeInTheDocument();
    expect(screen.queryByTestId('chat-message-action-reply')).not.toBeInTheDocument();
  });

  it('draws offer moves as cards with no message menu', async () => {
    renderPage([fromVenue, offerLine('m1', 1, { event: 'OFFER', by: 'HOST' })]);
    expect(await screen.findByRole('article', { name: 'You sent an offer' })).toBeInTheDocument();
    expect(screen.getByTestId('chat-message-more-t1')).toBeInTheDocument();
    expect(screen.queryByTestId('chat-message-more-m1')).not.toBeInTheDocument();
  });
});

describe('VenueChatPage — editing and deleting the reader’s own line', () => {
  /** Opens Edit on the reader's line; the dialog's box starts from what the line says. */
  const openEdit = async () => {
    await screen.findByText('See you at 7');
    openMenu('t2');
    fireEvent.click(screen.getByTestId('chat-message-action-edit'));
    expect(await screen.findByText('Edit message', { selector: 'h2' })).toBeInTheDocument();
    return screen.getByDisplayValue('See you at 7');
  };
  const save = () => fireEvent.click(screen.getByTestId('venue-chat-edit-save'));

  it('rewrites the line in place, starting from what it says, and marks it edited', async () => {
    const edited = myLine('t2', 1, { text: 'See you at 8', edited_at: at(4) });
    renderPage([fromVenue, mineText], [editMock({ message_id: 't2', text: 'See you at 8' }, { line: edited })]);
    const box = await openEdit();

    // Sent trimmed: the padding never reaches the server.
    fireEvent.change(box, { target: { value: '  See you at 8  ' } });
    save();

    await waitFor(() => expect(screen.queryByTestId('venue-chat-edit-save')).not.toBeInTheDocument());
    expect(bubble('t2').getByText('See you at 8')).toBeInTheDocument();
    expect(bubble('t2').getByText(/· Edited$/)).toBeInTheDocument();
    expect(screen.queryByText('See you at 7')).not.toBeInTheDocument();
  });

  it('refuses an emptied line without asking the server', async () => {
    renderPage([fromVenue, mineText]);
    fireEvent.change(await openEdit(), { target: { value: '   ' } });
    save();

    expect(await screen.findByText('Write something first')).toBeInTheDocument();
    expect(screen.queryByTestId('venue-chat-error')).not.toBeInTheDocument();
    expect(bubble('t2').getByText('See you at 7')).toBeInTheDocument();
  });

  it('keeps the dialog and the old words when the server refuses the edit, and says why', async () => {
    renderPage(
      [fromVenue, mineText],
      [editMock({ message_id: 't2', text: 'See you at 8' }, { error: new Error('A message can be edited for 15 minutes') })],
    );
    fireEvent.change(await openEdit(), { target: { value: 'See you at 8' } });
    save();

    expect(await errorBanner()).toHaveTextContent('A message can be edited for 15 minutes');
    expect(screen.getByTestId('venue-chat-edit-save')).toBeInTheDocument();
    expect(bubble('t2').getByText('See you at 7')).toBeInTheDocument();
  });

  it('takes the line back for both sides once the reader confirms', async () => {
    renderPage([fromVenue, mineText], [deleteMock('t2')]);
    await screen.findByText('See you at 7');
    openMenu('t2');
    fireEvent.click(screen.getByTestId('chat-message-action-delete'));
    expect(await screen.findByText('It is removed from the chat for both sides.')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => expect(screen.queryByTestId('chat-message-t2')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.queryByText('Delete this message?')).not.toBeInTheDocument());
    expect(screen.getByText('Hello!')).toBeInTheDocument();
  });

  it('keeps a line the server would not remove, and says why', async () => {
    renderPage([fromVenue, mineText], [deleteMock('t2', new Error('This message is already gone'))]);
    await screen.findByText('See you at 7');
    openMenu('t2');
    fireEvent.click(screen.getByTestId('chat-message-action-delete'));
    fireEvent.click(await screen.findByTestId('confirm-dialog-confirm'));

    expect(await errorBanner()).toHaveTextContent('This message is already gone');
    expect(screen.getByTestId('chat-message-t2')).toBeInTheDocument();
    expect(screen.getByText('Delete this message?')).toBeInTheDocument();
  });
});

describe('VenueChatPage — reactions', () => {
  it('reacts to a bubble from its double-tap, and shows the reaction the server answers with', async () => {
    const reacted = line('t1', { reactions: [{ __typename: 'PodMessageReaction', user_id: 'u-host', emoji: '👍' }] });
    renderPage([fromVenue, mineText], [reactMock({ message_id: 't1', emoji: '👍' }, { line: reacted })]);
    const text = await screen.findByText('Hello!');
    fireEvent.doubleClick(text.closest('[role="button"]') as HTMLElement);
    fireEvent.click(await screen.findByTestId('emoji-👍'));

    expect(await screen.findByTestId('reaction-t1-👍')).toHaveTextContent('👍 1');
    await waitFor(() => expect(screen.queryByTestId('emoji-bar')).not.toBeInTheDocument());
  });

  it('opens the picker from the menu, and sends nothing when it is closed unpicked', async () => {
    renderPage([fromVenue, mineText]);
    await screen.findByText('Hello!');
    openMenu('t1');
    fireEvent.click(screen.getByTestId('chat-message-action-react'));
    const bar = await screen.findByTestId('emoji-bar');

    fireEvent.keyDown(bar, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByTestId('emoji-bar')).not.toBeInTheDocument());
    expect(screen.queryByTestId('venue-chat-error')).not.toBeInTheDocument();
  });

  it('reacts to an offer card like any line', async () => {
    const offer = offerLine('m1', 1, { event: 'OFFER', by: 'HOST' });
    const reacted = { ...offer, reactions: [{ __typename: 'PodMessageReaction', user_id: 'u-venue', emoji: '🎉' }] };
    renderPage([fromVenue, offer], [reactMock({ message_id: 'm1', emoji: '🎉' }, { line: reacted })]);
    const card = within(await screen.findByRole('article', { name: 'You sent an offer' }));
    fireEvent.click(card.getByRole('button', { name: 'React' }));
    fireEvent.click(await screen.findByRole('button', { name: 'React with 🎉' }));

    expect(await card.findByTestId('line-reaction-🎉')).toHaveTextContent('🎉 1');
  });

  it('says the reaction did not go through when the server gives no reason', async () => {
    renderPage([fromVenue, mineText], [reactMock({ message_id: 't1', emoji: '🔥' }, { error: new Error('') })]);
    const text = await screen.findByText('Hello!');
    fireEvent.doubleClick(text.closest('[role="button"]') as HTMLElement);
    fireEvent.click(await screen.findByTestId('emoji-🔥'));

    expect(await errorBanner()).toHaveTextContent(FAILED);
    expect(screen.queryByTestId('reaction-t1-🔥')).not.toBeInTheDocument();
  });
});

describe('VenueChatPage — who has seen how far', () => {
  const faceAfter = (id: string) => screen.getByTestId(`chat-message-${id}`).nextElementSibling;

  it("draws each other member's face under the last line they read, moving it only forward", async () => {
    const room = roomMock('HOST', {
      read_marks: [readMark('u-venue', 'VENUE', 'Ravi', at(0, 30)), readMark('u-host', 'HOST', 'Asha', at(2))],
    });
    renderPage([fromVenue, mineText, myLine('t3', 2, { text: 'Parking is at the back' })], [], room);
    await screen.findByText('Parking is at the back');

    expect(screen.getAllByTestId('seen-faces')).toHaveLength(1);
    expect(faceAfter('t1')).toHaveAccessibleName('Seen by Ravi');
    // The reader's own mark draws no face.
    expect(screen.queryByRole('img', { name: /Asha/ })).not.toBeInTheDocument();

    act(() => socket.onRead?.(readMark('u-venue', 'VENUE', 'Ravi', at(2, 30)) as VenueChatReadMark));
    await waitFor(() => expect(faceAfter('t3')).toHaveAccessibleName('Seen by Ravi'));
    expect(screen.getAllByTestId('seen-faces')).toHaveLength(1);

    // A late frame from before never moves a mark back.
    act(() => socket.onRead?.(readMark('u-venue', 'VENUE', 'Ravi', at(0, 10)) as VenueChatReadMark));
    expect(faceAfter('t3')).toHaveAccessibleName('Seen by Ravi');
    expect(faceAfter('t1')).not.toHaveAttribute('data-testid', 'seen-faces');
  });

  it('lets the host change their own counter only until the venue has read it', async () => {
    const lines = [
      offerLine('m1', 1, { event: 'OFFER', by: 'HOST' }),
      offerLine('m2', 2, { event: 'COUNTER', by: 'VENUE', round: 2, model: 'FLAT', rate: 7000 }),
      offerLine('m3', 3, { event: 'COUNTER', by: 'HOST', round: 3, model: 'FLAT', rate: 6000 }),
    ];
    render(
      <MockedProvider
        mockLinkDefaultOptions={{ delay: 0 }}
        mocks={[roomMock('HOST'), linesMock(lines), offerMock(liveOffer({ status: 'COUNTERED', awaiting: 'VENUE', round: 3 })), markReadMock()]}
      >
        <VenueChatPage />
      </MockedProvider>,
    );
    const mine = within(await screen.findByTestId('offer-line-slot-1-3-COUNTER'));
    expect(await mine.findByTestId('offer-edit')).toBeInTheDocument();
    expect(mine.getByTestId('offer-withdraw')).toBeInTheDocument();

    act(() => socket.onRead?.(readMark('u-venue', 'VENUE', 'Ravi', at(3, 30)) as VenueChatReadMark));

    await waitFor(() => expect(mine.queryByTestId('offer-edit')).not.toBeInTheDocument());
    expect(mine.queryByTestId('offer-withdraw')).not.toBeInTheDocument();
  });
});

describe('VenueChatPage — the read mark', () => {
  const opened = async (lines: object[], newestText: string) => {
    const sent: unknown[] = [];
    render(
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[roomMock('HOST'), linesMock(lines), offerMock(null), markReadMock(sent)]}>
        <VenueChatPage />
      </MockedProvider>,
    );
    await screen.findByText(newestText);
    return sent;
  };

  it('tells the other side the thread is read when it opens on their line', async () => {
    const sent = await opened([mineText, line('t4', { text: 'Got it', createdAt: at(3) })], 'Got it');
    await waitFor(() => expect(sent.length).toBeGreaterThan(0));
    expect(new Set(sent.map((variables) => JSON.stringify(variables)))).toEqual(new Set([JSON.stringify({ pod_id: 'pod-1' })]));
  });

  it('marks nothing while the newest line is the reader’s own', async () => {
    const sent = await opened([fromVenue, mineText], 'See you at 7');
    // Give a stray mark the chance to go out before saying none did.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(sent).toEqual([]);
  });
});
