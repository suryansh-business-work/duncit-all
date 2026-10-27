import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { VENUE_CHAT_PAGE } from '@duncit/utils';
import { renderWithProviders } from '../../../../../__tests__/testkit';
import { ADMIN_VENUE_CHAT_MESSAGES } from '../queries';
import VenueChatReadOnlyThread from '../VenueChatReadOnlyThread';

const move = (over: Record<string, unknown>) => ({
  __typename: 'VenueChatOffer',
  slot_id: 'slot-1',
  round: 1,
  event: 'OFFER',
  by: 'HOST',
  model: 'PER_GUEST',
  rate: 300,
  min_guests: 8,
  max_guests: 20,
  offerings: ['10 chairs'],
  note: '',
  start_at: '2026-12-05T12:30:00.000Z',
  end_at: '2026-12-05T14:30:00.000Z',
  space_label: '',
  pets: false,
  venue_receives_min: 2400,
  venue_receives_max: 6000,
  total_min: 2640,
  total_max: 6600,
  expires_at: '2026-12-02T06:30:00.000Z',
  reason: '',
  images: [],
  ...over,
});

const reaction = (user_id: string, emoji: string) => ({ __typename: 'PodMessageReaction', user_id, emoji });

const line = (id: string, over: Record<string, unknown> = {}) => ({
  __typename: 'PodMessage',
  id,
  pod_id: 'pod-1',
  user_id: 'u-host',
  user_name: 'Asha',
  user_photo: null,
  type: 'TEXT',
  text: 'Is the terrace free?',
  image_url: null,
  deleted: false,
  createdAt: '2026-12-01T06:00:00.000Z',
  edited_at: null,
  reactions: [],
  offer: null,
  ...over,
});

const messagesMock = (lines: object[]): MockedResponse => ({
  request: { query: ADMIN_VENUE_CHAT_MESSAGES, variables: { pod_id: 'pod-1', limit: VENUE_CHAT_PAGE } },
  result: { data: { adminVenueChatMessages: lines } },
});

const mount = (lines: object[], onBack = vi.fn()) => {
  renderWithProviders(<VenueChatReadOnlyThread podId="pod-1" title="Pottery night" onBack={onBack} />, {
    mocks: [messagesMock(lines)],
  });
  return onBack;
};

describe('VenueChatReadOnlyThread', () => {
  it('reads every line to staff, each offer move as its card in the third person, with nothing to answer', async () => {
    mount([
      line('t1'),
      line('p1', { type: 'IMAGE', text: '', image_url: 'https://img.test/terrace.jpg' }),
      line('m1', { type: 'OFFER', text: 'Booking offer', offer: move({ event: 'OFFER', by: 'HOST' }) }),
      line('m2', {
        type: 'OFFER',
        text: 'Counter offer',
        user_id: 'u-venue',
        user_name: 'Ravi',
        offer: move({ event: 'COUNTER', by: 'VENUE', round: 2, model: 'FLAT', rate: 7000, note: 'Weekend rate' }),
      }),
    ]);
    expect(await screen.findByText('Is the terrace free?')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Photo' })).toHaveAttribute('src', 'https://img.test/terrace.jpg');

    const offered = within(screen.getByRole('article', { name: 'New booking offer' }));
    expect(offered.getByText(/^Costs the pod/)).toHaveTextContent('₹2,640 – ₹6,600');
    expect(offered.queryByTestId('offer-answer-by')).not.toBeInTheDocument();

    const countered = within(screen.getByRole('article', { name: 'The venue countered' }));
    expect(countered.getByText('Note from the venue')).toBeInTheDocument();
    expect(countered.getByTestId('offer-answer-by')).toBeInTheDocument();
    expect(screen.queryByText(/^You receive/)).not.toBeInTheDocument();
    // Staff read; only the way back is a button.
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('shows a spinner while the lines load and a note when nobody has written', async () => {
    mount([]);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(await screen.findByText('Nobody has written in this chat yet.')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('says the chats could not be loaded when the read fails', async () => {
    renderWithProviders(<VenueChatReadOnlyThread podId="pod-1" title="Pottery night" onBack={vi.fn()} />, {
      mocks: [
        {
          request: { query: ADMIN_VENUE_CHAT_MESSAGES, variables: { pod_id: 'pod-1', limit: VENUE_CHAT_PAGE } },
          error: new Error('network down'),
        },
      ],
    });
    expect(await screen.findByRole('alert')).toHaveTextContent("Could not load this venue's chats.");
    expect(screen.queryByText('Nobody has written in this chat yet.')).not.toBeInTheDocument();
  });

  it('draws a sender with a photo, and a photo line without a url as its text', async () => {
    mount([
      line('t1', { user_photo: 'https://img.test/asha.jpg' }),
      line('p1', { type: 'IMAGE', text: 'Terrace picture', image_url: null }),
    ]);
    expect(await screen.findByText('Terrace picture')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Photo' })).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Asha' })).toHaveAttribute('src', 'https://img.test/asha.jpg');
  });

  it('still draws a line whose sender has no name or photo on record', async () => {
    mount([line('t1', { user_name: null, user_photo: null, text: 'Left the group' })]);
    expect(await screen.findByText('Left the group')).toBeInTheDocument();
    expect(screen.getByRole('listitem').querySelector('span')).toHaveTextContent(/^· \S+/);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('keeps an offer line it cannot draw as its text, and goes back', async () => {
    const onBack = mount([line('m1', { type: 'OFFER', text: 'Offer withdrawn', offer: move({ event: 'WITHDRAWN' }) })]);
    expect(await screen.findByText('Offer withdrawn')).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('says which lines were edited after they were sent — a text line and an offer card alike', async () => {
    mount([
      line('t1', { text: 'Terrace or loft?', edited_at: '2026-12-01T06:05:00.000Z' }),
      line('t2', { user_id: 'u-venue', user_name: 'Ravi', text: 'Both are free.' }),
      line('m1', {
        type: 'OFFER',
        text: 'Counter offer',
        user_id: 'u-venue',
        user_name: 'Ravi',
        edited_at: '2026-12-01T07:00:00.000Z',
        offer: move({ event: 'COUNTER', by: 'VENUE', round: 2 }),
      }),
    ]);
    expect(await screen.findByText('Terrace or loft?')).toBeInTheDocument();

    expect(screen.getByText(/^Asha · .+ · Edited$/)).toBeInTheDocument();
    const ravi = screen.getAllByText(/^Ravi · /);
    expect(ravi).toHaveLength(2);
    // Ravi's text line is as first sent; his counter was revised, and says so on the card too.
    expect(ravi[0]).not.toHaveTextContent('Edited');
    expect(ravi[1]).toHaveTextContent(/ · Edited$/);
    const card = within(screen.getByRole('article', { name: 'The venue countered' }));
    expect(card.getByTestId('offer-line-time')).toHaveTextContent(/^Sent .+ · Edited$/);
  });

  it('shows the reactions on every line as a record staff cannot add to', async () => {
    mount([
      line('t1', { reactions: [reaction('u-host', '👍'), reaction('u-venue', '👍'), reaction('u-venue', '🎉')] }),
      line('t2', { user_id: 'u-venue', user_name: 'Ravi', text: 'Both are free.' }),
      line('m1', {
        type: 'OFFER',
        text: 'Booking offer',
        offer: move({ event: 'OFFER', by: 'HOST' }),
        reactions: [reaction('u-venue', '❤️')],
      }),
    ]);
    expect(await screen.findByText('Is the terrace free?')).toBeInTheDocument();

    // One row for the text line's chips and one inside the card — none for a line nobody reacted to.
    const rows = screen.getAllByTestId('line-reactions');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText('👍 2')).toBeInTheDocument();
    expect(within(rows[0]).getByText('🎉 1')).toBeInTheDocument();
    const card = within(screen.getByRole('article', { name: 'New booking offer' }));
    expect(card.getByTestId('line-reactions')).toHaveTextContent('❤️ 1');
    // Nothing to react with and no chip to toggle: only the way back is a button.
    expect(screen.queryByRole('button', { name: 'React' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});
