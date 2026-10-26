import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { CHAT_EMOJIS, type PinnedOfferSource, type VenueChatReadMark } from '@duncit/utils';
import LineReactions from '../src/offers/chat/LineReactions';
import OfferChatCard from '../src/offers/chat/OfferChatCard';
import SeenFaces from '../src/offers/chat/SeenFaces';
import VenueOfferPinnedBar from '../src/offers/chat/VenueOfferPinnedBar';
import { makeMove, withApollo } from './offer-fixtures';

/** Two members liked the line (the reader one of them); a third cheered it. */
const reactions = [
  { user_id: 'u-asha', emoji: '👍' },
  { user_id: 'u-me', emoji: '👍' },
  { user_id: 'u-ravi', emoji: '🎉' },
];

describe('LineReactions', () => {
  it('draws nothing for a line nobody reacted to when the reader cannot react', () => {
    const { container } = render(<LineReactions reactions={null} viewerId="u-me" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('reads the reactions as a record — one chip per emoji with its count — when the reader cannot react', () => {
    render(<LineReactions reactions={reactions} viewerId="u-me" />);
    expect(screen.getByTestId('line-reaction-👍')).toHaveTextContent('👍 2');
    expect(screen.getByTestId('line-reaction-🎉')).toHaveTextContent('🎉 1');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it("marks the reader's own reaction and toggles it with a tap", () => {
    const onReact = vi.fn();
    render(<LineReactions reactions={reactions} viewerId="u-me" onReact={onReact} />);
    const mine = screen.getByRole('button', { name: '👍 2' });
    const theirs = screen.getByRole('button', { name: '🎉 1' });
    expect(mine).toHaveClass('MuiChip-filled', 'MuiChip-colorPrimary');
    expect(theirs).toHaveClass('MuiChip-outlined', 'MuiChip-colorDefault');
    fireEvent.click(mine);
    expect(onReact).toHaveBeenCalledWith('👍');
    fireEvent.click(theirs);
    expect(onReact).toHaveBeenLastCalledWith('🎉');
  });

  it('reads no reaction as the reader’s when nobody is signed in', () => {
    render(<LineReactions reactions={reactions} viewerId={null} onReact={vi.fn()} />);
    expect(screen.getByRole('button', { name: '👍 2' })).toHaveClass('MuiChip-outlined');
  });

  it('offers every quick emoji to react with, and closes once one is picked', async () => {
    const onReact = vi.fn();
    render(<LineReactions reactions={[]} viewerId="u-me" onReact={onReact} />);
    fireEvent.click(screen.getByRole('button', { name: 'React' }));
    for (const emoji of CHAT_EMOJIS) expect(screen.getByRole('button', { name: `React with ${emoji}` })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'React with 🎉' }));
    expect(onReact).toHaveBeenCalledWith('🎉');
    await waitFor(() => expect(screen.queryByRole('button', { name: 'React with 🎉' })).not.toBeInTheDocument());
  });

  it('closes the quick emoji on Escape without reacting', async () => {
    const onReact = vi.fn();
    render(<LineReactions reactions={[]} viewerId="u-me" onReact={onReact} />);
    fireEvent.click(screen.getByRole('button', { name: 'React' }));
    fireEvent.keyDown(screen.getByRole('button', { name: 'React with 👍' }), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('button', { name: 'React with 👍' })).not.toBeInTheDocument());
    expect(onReact).not.toHaveBeenCalled();
  });
});

const mark = (user_id: string, name: string, photo: string | null = null): VenueChatReadMark => ({
  user_id,
  side: 'HOST',
  name,
  photo,
  last_read_at: '2026-12-01T06:30:00.000Z',
});

describe('SeenFaces', () => {
  it.each([undefined, []])('draws nothing when nobody has read up to the line (%j)', (marks) => {
    const { container } = render(<SeenFaces marks={marks} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows each reader's face — their photo, or their initial — named for a screen reader", () => {
    render(<SeenFaces marks={[mark('u-asha', 'asha'), mark('u-ravi', 'Ravi', 'https://ik.imagekit.io/duncit/u/ravi.jpg')]} />);
    const faces = screen.getByRole('img', { name: 'Seen by asha, Ravi' });
    expect(within(faces).getByText('A')).toBeInTheDocument();
    // The photo is decorative (the group is named), so it has no role of its own to query by.
    expect(faces.querySelector('img')).toHaveAttribute('src', 'https://ik.imagekit.io/duncit/u/ravi.jpg');
    expect(within(faces).queryByText('R')).not.toBeInTheDocument();
  });
});

const line = { createdAt: '2026-12-01T06:30:00.000Z', edited_at: null, reactions: [] };

describe('OfferChatCard, as a line of the thread', () => {
  it('says when the move was made, and nothing about edits while it is as first sent', () => {
    withApollo([], <OfferChatCard move={makeMove()} viewer="STAFF" newest={false} line={line} />);
    const when = within(screen.getByTestId('offer-line-time')).getByText(/^Sent \S/);
    expect(when.tagName).toBe('TIME');
    expect(when).toHaveAttribute('datetime', line.createdAt);
    expect(screen.getByTestId('offer-line-time')).not.toHaveTextContent('Edited');
    // Staff react to nothing, and nobody has yet.
    expect(screen.queryByTestId('line-reactions')).not.toBeInTheDocument();
  });

  it('says the move was edited since it was sent', () => {
    withApollo([], <OfferChatCard move={makeMove()} viewer="STAFF" newest={false} line={{ ...line, edited_at: '2026-12-01T06:40:00.000Z' }} />);
    expect(screen.getByTestId('offer-line-time')).toHaveTextContent(/^Sent \S.* · Edited$/);
  });

  it("carries the line's reactions, and a member reacts to the card like any line", () => {
    const onReact = vi.fn();
    withApollo(
      [],
      <OfferChatCard
        move={makeMove({ event: 'COUNTER', by: 'VENUE', round: 2 })}
        viewer="VENUE"
        newest={false}
        line={{ ...line, reactions: [{ user_id: 'u-host', emoji: '👍' }] }}
        viewerId="u-venue"
        onReact={onReact}
      />,
    );
    const card = within(screen.getByRole('article'));
    expect(card.getByRole('button', { name: '👍 1' })).toHaveClass('MuiChip-outlined');
    fireEvent.click(card.getByRole('button', { name: '👍 1' }));
    expect(onReact).toHaveBeenCalledWith('👍');
    expect(card.getByRole('button', { name: 'React' })).toBeInTheDocument();
  });

  it('draws no time line without the chat line it was posted as', () => {
    withApollo([], <OfferChatCard move={makeMove()} viewer="HOST" newest={false} />);
    expect(screen.queryByTestId('offer-line-time')).not.toBeInTheDocument();
    expect(screen.queryByTestId('line-reactions')).not.toBeInTheDocument();
  });
});

/** The pod's live offer, waiting on the venue; the host has used one of their three counters. */
const pinned = (over: Partial<PinnedOfferSource> = {}): PinnedOfferSource => ({
  status: 'SENT',
  awaiting: 'VENUE',
  expires_at: '2026-12-02T06:30:00.000Z',
  counters_per_side: 3,
  host_counters_used: 1,
  venue_counters_used: 0,
  ...over,
});

describe('VenueOfferPinnedBar', () => {
  it('pins nothing without a live offer', () => {
    const { container } = withApollo([], <VenueOfferPinnedBar offer={null} side="VENUE" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("tells the venue it is their move, until when, and both sides' counters left", () => {
    withApollo([], <VenueOfferPinnedBar offer={pinned()} side="VENUE" />);
    const bar = within(screen.getByRole('status', { name: 'Booking offer' }));
    expect(bar.getByTestId('venue-offer-pin-status')).toHaveTextContent('Your move');
    expect(bar.getByTestId('venue-offer-pin-status')).toHaveClass('MuiChip-colorWarning');
    expect(bar.getByText(/^Answer by \S/)).toBeInTheDocument();
    expect(bar.getByTestId('venue-offer-pin-counters')).toHaveTextContent('You: 3 of 3 counters left · Host: 2 of 3 left');
  });

  it("tells the host they wait on the venue, with the venue's counters as theirs", () => {
    withApollo([], <VenueOfferPinnedBar offer={pinned()} side="HOST" />);
    const status = screen.getByTestId('venue-offer-pin-status');
    expect(status).toHaveTextContent('Waiting for their answer');
    expect(status).toHaveClass('MuiChip-colorDefault');
    expect(screen.getByTestId('venue-offer-pin-counters')).toHaveTextContent('You: 2 of 3 counters left · Venue: 3 of 3 left');
  });

  it('says the booking is confirmed once accepted, with no deadline and no counters', () => {
    withApollo([], <VenueOfferPinnedBar offer={pinned({ status: 'ACCEPTED', awaiting: null })} side="HOST" />);
    expect(screen.getByTestId('venue-offer-pin-status')).toHaveTextContent('Booking confirmed');
    expect(screen.queryByText(/^Answer by/)).not.toBeInTheDocument();
    expect(screen.queryByTestId('venue-offer-pin-counters')).not.toBeInTheDocument();
  });

  it('shows no chip for a closed status it does not know', () => {
    withApollo([], <VenueOfferPinnedBar offer={pinned({ status: 'EXPIRED', awaiting: null })} side="VENUE" />);
    expect(screen.getByRole('status', { name: 'Booking offer' })).toBeInTheDocument();
    expect(screen.queryByTestId('venue-offer-pin-status')).not.toBeInTheDocument();
  });

  it('names no counters or deadline an older server does not send', () => {
    const older = pinned({ expires_at: null, counters_per_side: undefined, host_counters_used: undefined, venue_counters_used: undefined });
    withApollo([], <VenueOfferPinnedBar offer={older} side="VENUE" />);
    expect(screen.getByTestId('venue-offer-pin-status')).toHaveTextContent('Your move');
    expect(screen.queryByText(/^Answer by/)).not.toBeInTheDocument();
    expect(screen.queryByTestId('venue-offer-pin-counters')).not.toBeInTheDocument();
  });
});
