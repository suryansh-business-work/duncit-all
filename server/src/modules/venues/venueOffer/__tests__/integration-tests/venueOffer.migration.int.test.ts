/**
 * "For the slot" (PER_SLOT) is retired for the flat price it was always priced
 * as. The boot migration rewrites every place a stored offer names it — the
 * host's terms, the venue's counter, each history step, the agreed basis and
 * each chat line's frozen terms — touches nothing else, and is a no-op the
 * second time, so it can run on every boot.
 *
 * Rows are written straight to the collections: PER_SLOT is no longer a value
 * the schema accepts, which is exactly the state an older row is in.
 */
import { Types } from 'mongoose';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { VenueChatMessageModel } from '@microservices/chat/venue/venueChat.model';
import { migratePerSlotOffers } from '../../venueOffer.migration';

const at = new Date('2027-01-01T10:00:00.000Z');
const quote = { model: 'FLAT', total: 7700, venue_payout: 7000 };

const step = (by: string, action: string, model: string | null) => ({ by, action, model, rate: 7000, total: 7700, note: '', at });

async function insertSlot(offer: Record<string, unknown> | null, priceBasis: Record<string, unknown> | null = null) {
  const _id = new Types.ObjectId();
  await VenueSlotModel.collection.insertOne({
    _id,
    venue_id: new Types.ObjectId(),
    owner_user_id: new Types.ObjectId(),
    start_at: new Date('2027-01-04T12:30:00.000Z'),
    end_at: new Date('2027-01-04T14:30:00.000Z'),
    status: 'PENDING',
    offer,
    price_basis: priceBasis,
  });
  return _id;
}

async function insertLine(model: string) {
  const _id = new Types.ObjectId();
  await VenueChatMessageModel.collection.insertOne({
    _id,
    pod_id: String(new Types.ObjectId()),
    venue_id: String(new Types.ObjectId()),
    user_id: String(new Types.ObjectId()),
    side: 'HOST',
    type: 'OFFER',
    text: 'Booking offer',
    offer: { slot_id: 'slot', round: 1, event: 'OFFER', by: 'HOST', model, rate: 7000 },
    createdAt: at,
  });
  return _id;
}

const rawSlot = (id: Types.ObjectId) => VenueSlotModel.collection.findOne({ _id: id });
const rawLine = (id: Types.ObjectId) => VenueChatMessageModel.collection.findOne({ _id: id });

describe('migratePerSlotOffers', () => {
  it('rewrites every PER_SLOT a booking and its chat carry as FLAT, and counts each kind of row it changed', async () => {
    const legacy = await insertSlot(
      {
        model: 'PER_SLOT',
        rate: 7000,
        quote,
        status: 'COUNTERED',
        round: 3,
        counter: { model: 'PER_SLOT', rate: 6500, quote, at },
        history: [step('HOST', 'OFFER', 'PER_SLOT'), step('VENUE', 'COUNTER', 'PER_GUEST'), step('HOST', 'COUNTER', 'PER_SLOT')],
      },
      { model: 'PER_SLOT', rate: 7000, min_guests: 0, pets: false }
    );
    const line = await insertLine('PER_SLOT');

    await expect(migratePerSlotOffers()).resolves.toEqual({ offers: 1, counters: 1, history: 1, bases: 1, chat_lines: 1 });

    const slot = await rawSlot(legacy);
    expect(slot?.offer.model).toBe('FLAT');
    expect(slot?.offer.counter.model).toBe('FLAT');
    // Only the retired steps change: the venue's per-guest counter stays per guest.
    expect(slot?.offer.history.map((h: { model: string }) => h.model)).toEqual(['FLAT', 'PER_GUEST', 'FLAT']);
    expect(slot?.price_basis.model).toBe('FLAT');
    // The money is untouched: FLAT is the price PER_SLOT always was.
    expect(slot?.offer).toMatchObject({ rate: 7000, round: 3, status: 'COUNTERED', counter: { rate: 6500 } });
    expect((await rawLine(line))?.offer).toMatchObject({ model: 'FLAT', rate: 7000, event: 'OFFER' });
  });

  it('leaves rows on the models that remain alone', async () => {
    const current = await insertSlot(
      {
        model: 'PER_GUEST',
        rate: 500,
        quote,
        status: 'SENT',
        round: 1,
        counter: null,
        history: [step('HOST', 'OFFER', 'PER_GUEST'), step('HOST', 'ACCEPT', null)],
      },
      { model: 'PER_GUEST', rate: 500, min_guests: 6, pets: false }
    );
    const noOffer = await insertSlot(null);
    const line = await insertLine('PER_HOUR');
    const before = { slot: await rawSlot(current), empty: await rawSlot(noOffer), line: await rawLine(line) };

    await expect(migratePerSlotOffers()).resolves.toEqual({ offers: 0, counters: 0, history: 0, bases: 0, chat_lines: 0 });

    expect(await rawSlot(current)).toEqual(before.slot);
    expect(await rawSlot(noOffer)).toEqual(before.empty);
    expect(await rawLine(line)).toEqual(before.line);
  });

  it('is a no-op the second time, so every boot may run it', async () => {
    await insertSlot({ model: 'FLAT', rate: 1, quote, status: 'SENT', round: 2, counter: { model: 'PER_SLOT', rate: 1, quote, at }, history: [] });
    await insertLine('PER_SLOT');

    await expect(migratePerSlotOffers()).resolves.toEqual({ offers: 0, counters: 1, history: 0, bases: 0, chat_lines: 1 });
    await expect(migratePerSlotOffers()).resolves.toEqual({ offers: 0, counters: 0, history: 0, bases: 0, chat_lines: 0 });
    expect(await VenueSlotModel.collection.countDocuments({ 'offer.counter.model': 'PER_SLOT' })).toBe(0);
    expect(await VenueChatMessageModel.collection.countDocuments({ 'offer.model': 'PER_SLOT' })).toBe(0);
  });
});
