import { Schema, model, Types, type Document } from 'mongoose';

/**
 * Stored status. EXPIRED is derived from `expires_at` at read time, exactly as
 * it is for virtual cards — the redemption guard enforces the date, so a clock
 * is never trusted twice. VOID is a card the Loyalty team cancelled (lost in
 * print, handed to the wrong person); it can never be redeemed again.
 */
export type PhysicalGiftCardStatus = 'ACTIVE' | 'REDEEMED' | 'VOID';

/**
 * One line of a card's history. REDEEM_FAILED records a wrong number/passcode
 * try, so the history can show who is guessing and the redeem path can stop a
 * member who keeps trying (the attempts are counted per member).
 * PASSCODE_VIEWED / PASSCODES_EXPORTED record every time a person read a
 * passcode in the console — a passcode is the card's value, so who saw it is
 * part of the audit, not a detail.
 */
export type PhysicalGiftCardEventType =
  | 'GENERATED'
  | 'REDEEMED'
  | 'VOIDED'
  | 'REDEEM_FAILED'
  | 'PASSCODE_VIEWED'
  | 'PASSCODES_EXPORTED';

export const PHYSICAL_GIFT_CARD_EVENT_TYPES: readonly PhysicalGiftCardEventType[] = [
  'GENERATED',
  'REDEEMED',
  'VOIDED',
  'REDEEM_FAILED',
  'PASSCODE_VIEWED',
  'PASSCODES_EXPORTED',
];

/**
 * One generation run: every card minted together, with the coins each carries.
 * A batch is either BULK (unmapped cards, to be printed and handed out) or
 * mapped — one card per chosen member, which only that member can redeem.
 */
export interface IPhysicalGiftCardBatch extends Document {
  _id: Types.ObjectId;
  label: string;
  coins: number;
  quantity: number;
  /** True when every card in the batch was mapped to a member at generation. */
  assigned: boolean;
  expires_at: Date;
  created_by: Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

/**
 * A printed scratch card. The 9-digit `card_number` is printed in the open; the
 * 16-digit `passcode` sits under the scratch panel. Holding both is holding the
 * coins — unless the card is mapped to a member, in which case only that member
 * can redeem it. Redeeming converts the card's coins into Duncit Coins in one
 * act, through the same once-only coin credit a virtual gift card uses.
 */
export interface IPhysicalGiftCard extends Document {
  _id: Types.ObjectId;
  card_number: string;
  /** 16 digits, no separators. Read in full only through the audited reveal and
   * batch-export queries — every list shows `passcode_last4`. */
  passcode: string;
  passcode_last4: string;
  coins: number;
  status: PhysicalGiftCardStatus;
  batch_id: Types.ObjectId;
  /** The member this card was generated for. Null on a bulk card until someone
   * redeems it. */
  assigned_user_id: Types.ObjectId | null;
  redeemed_by_user_id: Types.ObjectId | null;
  redeemed_at: Date | null;
  expires_at: Date;
  created_by: Types.ObjectId;
  voided_by: Types.ObjectId | null;
  voided_at: Date | null;
  void_reason: string;
  created_at: Date;
  updated_at: Date;
}

export interface IPhysicalGiftCardEvent extends Document {
  _id: Types.ObjectId;
  /** Null on a failed try against a card number that does not exist, and on a
   * batch export (which reads every card of `batch_id` at once). */
  card_id: Types.ObjectId | null;
  /** What was typed or minted — a snapshot, so the row reads on its own. */
  card_number: string;
  batch_id: Types.ObjectId | null;
  type: PhysicalGiftCardEventType;
  /** The admin on GENERATED / VOIDED / passcode rows, the member on REDEEMED /
   * REDEEM_FAILED. */
  actor_user_id: Types.ObjectId;
  coins: number;
  note: string;
  created_at: Date;
}

const batchSchema = new Schema<IPhysicalGiftCardBatch>(
  {
    label: { type: String, required: true, trim: true, maxlength: 120 },
    coins: { type: Number, required: true, min: 1 },
    quantity: { type: Number, required: true, min: 1 },
    assigned: { type: Boolean, default: false },
    expires_at: { type: Date, required: true },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);
batchSchema.index({ created_at: -1 });

const cardSchema = new Schema<IPhysicalGiftCard>(
  {
    card_number: { type: String, required: true, unique: true, trim: true },
    passcode: { type: String, required: true, trim: true },
    passcode_last4: { type: String, required: true, trim: true },
    coins: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ['ACTIVE', 'REDEEMED', 'VOID'], default: 'ACTIVE', index: true },
    batch_id: { type: Schema.Types.ObjectId, ref: 'PhysicalGiftCardBatch', required: true, index: true },
    assigned_user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    redeemed_by_user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    redeemed_at: { type: Date, default: null },
    expires_at: { type: Date, required: true },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    voided_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    voided_at: { type: Date, default: null },
    void_reason: { type: String, default: '', trim: true, maxlength: 300 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);
cardSchema.index({ created_at: -1 });

const eventSchema = new Schema<IPhysicalGiftCardEvent>(
  {
    card_id: { type: Schema.Types.ObjectId, ref: 'PhysicalGiftCard', default: null, index: true },
    card_number: { type: String, default: '', trim: true },
    batch_id: { type: Schema.Types.ObjectId, ref: 'PhysicalGiftCardBatch', default: null },
    type: { type: String, enum: PHYSICAL_GIFT_CARD_EVENT_TYPES, required: true },
    actor_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    coins: { type: Number, default: 0, min: 0 },
    note: { type: String, default: '', trim: true, maxlength: 300 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);
eventSchema.index({ created_at: -1 });
// The redeem path counts one member's recent failed tries before it checks a
// passcode, so a guessing run is stopped without scanning the whole history.
eventSchema.index({ actor_user_id: 1, type: 1, created_at: -1 });
// A card is redeemed exactly once, however often the redeem call is retried —
// the database decides, not a read-then-write check. Partial: every other
// event type may repeat.
eventSchema.index(
  { card_id: 1, type: 1 },
  { unique: true, partialFilterExpression: { type: 'REDEEMED' } }
);

export const PhysicalGiftCardBatchModel = model<IPhysicalGiftCardBatch>(
  'PhysicalGiftCardBatch',
  batchSchema
);
export const PhysicalGiftCardModel = model<IPhysicalGiftCard>('PhysicalGiftCard', cardSchema);
export const PhysicalGiftCardEventModel = model<IPhysicalGiftCardEvent>(
  'PhysicalGiftCardEvent',
  eventSchema
);
