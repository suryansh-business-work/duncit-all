import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { VenueChatReadMark } from '@duncit/utils';
import VenueChatThread from './VenueChatThread';
import { partnerUser, renderWithProviders } from '../../__tests__/render';
import { scriptedLink, type ScriptedAnswer, type SentOperation } from '../../__tests__/groupC-link';
import {
  at,
  line,
  liveOffer,
  offerLine,
  ownLine,
  reaction,
  readMark,
  venueCounter,
} from '../../__tests__/venue-chat-fixtures';

afterEach(cleanup);

const SUBJECT = { pod_id: 'pod-1', pod_title: 'Pottery night', venue_name: 'Skyline Banquets' };

/** The thread as the venue owner (u-venue) reads it, over the given page. */
const mount = (
  lines: unknown[],
  { answers = {}, sent = [], marks = [] }: { answers?: Record<string, ScriptedAnswer>; sent?: SentOperation[]; marks?: VenueChatReadMark[] } = {},
) =>
  renderWithProviders(<VenueChatThread podId="pod-1" side="VENUE" subject={SUBJECT} marks={marks} />, {
    link: scriptedLink(
      {
        VenueChatMessages: { venueChatMessages: lines },
        PodVenueOfferTerms: { podVenueOffer: null },
        MarkVenueChatRead: { markVenueChatRead: true },
        ...answers,
      },
      sent,
    ),
    user: partnerUser({ user_id: 'u-venue' }),
  });

const bubbleOf = (text: string) => {
  const item = screen.getByText(text).closest('li');
  if (!(item instanceof HTMLElement)) throw new Error(`"${text}" is not drawn as a line`);
  return within(item);
};

describe('VenueChatThread — reading', () => {
  it('reads the latest page without marking it read, then marks it once the host’s newest line is on screen', async () => {
    const sent: SentOperation[] = [];
    mount([ownLine('o1', { createdAt: at(1) }), line('t1', { createdAt: at(3) })], { sent });
    expect(await screen.findByText('Is the terrace free?')).toBeTruthy();
    expect(sent.find((op) => op.name === 'VenueChatMessages')?.variables).toEqual({ pod_id: 'pod-1', limit: 50, mark_read: false });
    await waitFor(() => expect(sent.find((op) => op.name === 'MarkVenueChatRead')?.variables).toEqual({ pod_id: 'pod-1' }));
  });

  it('marks nothing while the newest line is the owner’s own, and marks it read when they come back to the tab', async () => {
    const sent: SentOperation[] = [];
    mount([line('t1'), ownLine('o1', { createdAt: at(2) })], { sent });
    expect(await screen.findByText('Yes, from 6 pm.')).toBeTruthy();
    expect(sent.some((op) => op.name === 'MarkVenueChatRead')).toBe(false);

    fireEvent(document, new Event('visibilitychange'));
    await waitFor(() => expect(sent.filter((op) => op.name === 'MarkVenueChatRead')).toHaveLength(1));
  });

  it('says who wrote each line, and when one was edited', async () => {
    mount([line('t1'), ownLine('o1', { edited_at: at(4) }), ownLine('p1', { type: 'IMAGE', text: '', image_url: 'https://img.test/hall.jpg', createdAt: at(6) })]);
    const host = bubbleOf('Is the terrace free?');
    expect(host.getByText(/^Asha ·/).textContent).not.toContain('Edited');
    expect(bubbleOf('Yes, from 6 pm.').getByText(/^You ·/).textContent).toMatch(/ · Edited$/);
    expect(screen.getByRole('img', { name: 'Photo from You' }).getAttribute('src')).toBe('https://img.test/hall.jpg');
  });
});

describe('VenueChatThread — reactions', () => {
  it('reacts to the host’s line and shows the line as everyone now sees it', async () => {
    const sent: SentOperation[] = [];
    mount([line('t1')], {
      sent,
      answers: {
        ReactToVenueChatMessage: { reactToVenueChatMessage: line('t1', { reactions: [reaction('u-host', '👍'), reaction('u-venue', '👍')] }) },
      },
    });
    fireEvent.click(await waitFor(() => bubbleOf('Is the terrace free?').getByTestId('line-react')));
    fireEvent.click(await screen.findByTestId('line-react-👍'));

    await waitFor(() =>
      expect(sent.find((op) => op.name === 'ReactToVenueChatMessage')?.variables).toEqual({ message_id: 't1', emoji: '👍' }),
    );
    const chip = await waitFor(() => bubbleOf('Is the terrace free?').getByTestId('line-reaction-👍'));
    expect(chip.textContent).toBe('👍 2');
    // The owner is one of the two, so the chip reads as theirs.
    expect(chip.className).toContain('MuiChip-filled');
  });

  it('reacts to an offer card like any line', async () => {
    const sent: SentOperation[] = [];
    const card = offerLine('m1', { event: 'OFFER', by: 'HOST' });
    mount([card], {
      sent,
      answers: { ReactToVenueChatMessage: { reactToVenueChatMessage: { ...card, reactions: [reaction('u-venue', '🎉')] } } },
    });
    const article = within(await screen.findByRole('article', { name: 'New booking offer' }));
    fireEvent.click(article.getByTestId('line-react'));
    fireEvent.click(await screen.findByTestId('line-react-🎉'));

    await waitFor(() =>
      expect(sent.find((op) => op.name === 'ReactToVenueChatMessage')?.variables).toEqual({ message_id: 'm1', emoji: '🎉' }),
    );
    expect((await article.findByTestId('line-reaction-🎉')).textContent).toBe('🎉 1');
  });

  it('says why a reaction did not go through, and the notice can be dismissed', async () => {
    mount([line('t1')], { answers: { ReactToVenueChatMessage: new Error('You are no longer in this chat') } });
    fireEvent.click(await waitFor(() => bubbleOf('Is the terrace free?').getByTestId('line-react')));
    fireEvent.click(await screen.findByTestId('line-react-❤️'));

    expect(await screen.findByText('You are no longer in this chat')).toBeTruthy();
    expect(bubbleOf('Is the terrace free?').queryByTestId('line-reaction-❤️')).toBeNull();
    fireEvent.click(await screen.findByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByText('You are no longer in this chat')).toBeNull());
  });
});

describe('VenueChatThread — who has seen the venue’s counter', () => {
  const lines = [
    offerLine('m1', { event: 'OFFER', by: 'HOST' }),
    { ...offerLine('m2', { event: 'COUNTER', by: 'VENUE', round: 2, model: 'FLAT', rate: 7000 }), user_id: 'u-venue', createdAt: at(7) },
  ];
  const answers = {
    PodVenueOfferTerms: { podVenueOffer: liveOffer({ status: 'COUNTERED', awaiting: 'HOST', round: 2, counter: venueCounter() }) },
  };

  it('lets the venue change or withdraw its counter while the host has not read that far', async () => {
    mount(lines, { answers, marks: [readMark('u-host', 'HOST', 'Asha Rao', at(6))] });
    const card = within(await screen.findByRole('article', { name: 'You countered' }));
    expect(await card.findByTestId('offer-edit')).toBeTruthy();
    expect(card.getByTestId('offer-withdraw')).toBeTruthy();
    // The host read up to the first offer: their face sits under it, not under the counter.
    const seen = screen.getByRole('img', { name: 'Seen by Asha Rao' });
    expect(within(seen.closest('li') as HTMLElement).getByRole('article', { name: 'New booking offer' })).toBeTruthy();
  });

  it('offers neither once the host has seen it, and draws the host’s face under it', async () => {
    mount(lines, { answers, marks: [readMark('u-host', 'HOST', 'Asha Rao', at(8))] });
    const card = within(await screen.findByRole('article', { name: 'You countered' }));
    // The pinned bar is drawn from the live offer, so once it shows the card has read it too.
    expect((await screen.findByTestId('venue-offer-pin-status')).textContent).toBe('Waiting for their answer');
    expect(card.queryByTestId('offer-revise')).toBeNull();
    const seen = await screen.findByRole('img', { name: 'Seen by Asha Rao' });
    expect(within(seen.closest('li') as HTMLElement).getByRole('article', { name: 'You countered' })).toBeTruthy();
  });
});
