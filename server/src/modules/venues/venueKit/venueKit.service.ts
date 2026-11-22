import { GraphQLError } from 'graphql';
import { isValidObjectId } from 'mongoose';
import { logs } from '@observability/log';
import { phoneKey } from '@utils/phone';
import { escapedSearchRegex, runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { validate } from '@utils/validate';
import {
  VENUE_KIT_INTEREST_STATUSES,
  VENUE_KIT_OFFER_DEFAULTS,
  VenueKitInterestModel,
  VenueKitOfferModel,
  type IVenueKitInterest,
  type IVenueKitOffer,
  type VenueKitSource,
} from './venueKit.model';
import { venueKitOtp } from './venueKit.otp';
import { interestStatusSchema, offerSchema, submitInterestSchema } from './venueKit.validator';

/** Allowlists for the shared table engine (DUNCIT TABLE CONTRACT v1). */
const INTEREST_TABLE_CONFIG: TableEntityConfig = {
  searchFields: [],
  sortFields: {
    name: 'name',
    email: 'email',
    phone_number: 'phone_number',
    status: 'status',
    source: 'source',
    created_at: 'created_at',
    last_submitted_at: 'last_submitted_at',
  },
  filterFields: {
    status: { type: 'enum' },
    source: { type: 'enum' },
    created_at: { type: 'date' },
    last_submitted_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

const iso = (date: Date | null | undefined) => (date ? date.toISOString() : null);

export const interestPub = (d: IVenueKitInterest) => ({
  id: d._id.toHexString(),
  name: d.name,
  email: d.email,
  email_verified_at: d.email_verified_at.toISOString(),
  phone_extension: d.phone_extension,
  phone_number: d.phone_number,
  phone_verified: Boolean(d.phone_verified_at),
  phone_verified_at: iso(d.phone_verified_at),
  source: d.source,
  status: d.status,
  note: d.note,
  submission_count: d.submission_count,
  last_submitted_at: d.last_submitted_at.toISOString(),
  created_at: d.created_at.toISOString(),
});

const offerPub = (d: Pick<IVenueKitOffer, keyof typeof VENUE_KIT_OFFER_DEFAULTS> & { updated_at?: Date | null }) => ({
  annual_price_paise: d.annual_price_paise,
  included_table_labels: d.included_table_labels,
  extra_label_price_paise: d.extra_label_price_paise,
  pos_activation_months: d.pos_activation_months,
  gift_card_count: d.gift_card_count,
  gift_card_value_paise: d.gift_card_value_paise,
  collab_gift_card_discount_pct: d.collab_gift_card_discount_pct,
  order_benefit_pct: d.order_benefit_pct,
  updated_at: iso(d.updated_at),
});

/** Name, email or number — one box, three columns. */
function searchFilter(search: string | null | undefined): Record<string, unknown> {
  const term = (search ?? '').trim();
  if (!term) return {};
  const pattern = escapedSearchRegex(term);
  return { $or: [{ name: pattern }, { email: pattern }, { phone_number: pattern }] };
}

/** Who is behind the write (created_by) is stamped by the audit plugin from the token; this is where. */
export interface SubmitContext {
  source: VenueKitSource;
}

export const venueKitService = {
  /** The offer every surface renders; the defaults until an admin has saved one. */
  async offer() {
    const doc = await VenueKitOfferModel.findOne({ key: 'default' }).lean();
    return doc ? offerPub(doc) : offerPub({ ...VENUE_KIT_OFFER_DEFAULTS, updated_at: null });
  },

  async updateOffer(input: unknown) {
    const values = await validate(offerSchema, input);
    const doc = await VenueKitOfferModel.findOneAndUpdate(
      { key: 'default' },
      { $set: values, $setOnInsert: { key: 'default' } },
      { new: true, upsert: true, runValidators: true }
    ).lean();
    logs.server.info('venueKit.service', 'updateOffer', { msg: 'Venue Kit offer changed', ...values });
    return offerPub(doc);
  },

  /**
   * Registers (or refreshes) one venue's interest.
   *
   * Both proofs are redeemed BEFORE either is spent, so a bad phone grant
   * leaves the email proof usable for a corrected retry. The email comes off
   * the proof, never off the payload; the phone grant must name the very
   * number being stored.
   */
  async submit(input: unknown, context: Readonly<SubmitContext>) {
    const values = await validate(submitInterestSchema, input);
    const emailProof = await venueKitOtp.redeem(values.email_token, 'VENUE_KIT_EMAIL');
    const phoneProof = values.phone_token ? await venueKitOtp.redeem(values.phone_token, 'VENUE_KIT_PHONE') : null;
    if (phoneProof && phoneKey(phoneProof.phone_number) !== phoneKey(values.phone_number)) {
      throw new GraphQLError('That phone code was for a different number — verify this number again', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    await venueKitOtp.spend(emailProof);
    if (phoneProof) await venueKitOtp.spend(phoneProof);

    const now = new Date();
    const existing = await VenueKitInterestModel.exists({ email: emailProof.email });
    const doc = await VenueKitInterestModel.findOneAndUpdate(
      { email: emailProof.email },
      {
        $set: {
          name: values.name,
          email_verified_at: now,
          phone_extension: values.phone_extension,
          phone_number: values.phone_number,
          // A re-submission with an unproved number un-proves the row: the
          // badge must describe the number now stored, not an older one.
          phone_verified_at: phoneProof ? now : null,
          last_submitted_at: now,
        },
        $setOnInsert: {
          email: emailProof.email,
          source: context.source,
          status: 'NEW',
          // An upsert does not apply schema defaults to a field an operator
          // names, and `$inc: 0` would write 0 — so the first submission sets
          // the count itself and only a repeat increments it.
          ...(existing ? {} : { submission_count: 1 }),
        },
        ...(existing ? { $inc: { submission_count: 1 } } : {}),
      },
      { new: true, upsert: true, runValidators: true }
    );
    logs.server.info('venueKit.service', 'submit', {
      msg: existing ? 'Venue Kit interest refreshed' : 'Venue Kit interest registered',
      interest_id: doc._id.toHexString(),
      source: context.source,
      phone_verified: Boolean(phoneProof),
    });
    return { ok: true, already_registered: Boolean(existing), interest: interestPub(doc) };
  },

  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IVenueKitInterest>(
      VenueKitInterestModel,
      searchFilter(input?.search),
      { ...input, search: null },
      INTEREST_TABLE_CONFIG
    );
    return { rows: docs.map(interestPub), total, page, page_size };
  },

  /** The tiles above the table — one aggregate. */
  async summary() {
    const rows = await VenueKitInterestModel.aggregate<{ _id: string; count: number; phone_verified: number }>([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          phone_verified: { $sum: { $cond: [{ $ne: ['$phone_verified_at', null] }, 1, 0] } },
        },
      },
    ]);
    const countOf = new Map(rows.map((row) => [row._id, row.count]));
    return {
      total: rows.reduce((sum, row) => sum + row.count, 0),
      phone_verified: rows.reduce((sum, row) => sum + row.phone_verified, 0),
      by_status: VENUE_KIT_INTEREST_STATUSES.map((status) => ({ status, count: countOf.get(status) ?? 0 })),
    };
  },

  async setStatus(input: unknown) {
    const { id, status, note } = await validate(interestStatusSchema, input);
    if (!isValidObjectId(id)) throw new GraphQLError('Venue Kit interest not found', { extensions: { code: 'NOT_FOUND' } });
    const doc = await VenueKitInterestModel.findByIdAndUpdate(
      id,
      { $set: { status, ...(note === undefined ? {} : { note }) } },
      { new: true, runValidators: true }
    );
    if (!doc) throw new GraphQLError('Venue Kit interest not found', { extensions: { code: 'NOT_FOUND' } });
    return interestPub(doc);
  },
};
