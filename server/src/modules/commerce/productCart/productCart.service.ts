import { createHash } from 'node:crypto';
import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { getUrlConfigs } from '@config/url-configs';
import { sendEmail } from '@services/email/email.service';
import { UserModel } from '@modules/access/user/user.model';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import {
  isFeatureEnabled,
  PRODUCT_VISIBILITY_FLAG,
} from '@modules/platform/settings/featureFlag.gate';
import { ProductCartModel, type IProductCart, type IProductCartLine } from './productCart.model';
import { productCartSettingsService } from './productCart.settings';

const HOUR_MS = 60 * 60 * 1000;
/** A cart longer than this is not a real cart; the rest is dropped. */
const MAX_LINES = 50;
const MAX_QUANTITY = 999;
/** Carts mailed per sweep — a backlog drains over several runs. */
const SWEEP_BATCH = 200;

export interface ProductCartLineInput {
  pod_id: string;
  product_id: string;
  variant_id?: string | null;
  quantity: number;
}

type CartDoc = IProductCart & { _id: Types.ObjectId };

const lineKey = (line: Pick<IProductCartLine, 'pod_id' | 'product_id' | 'variant_id'>) =>
  `${String(line.pod_id)}:${String(line.product_id)}:${line.variant_id}`;

/** Valid, de-duplicated lines (the last copy of a line wins), capped. */
function cleanLines(input: ProductCartLineInput[]): IProductCartLine[] {
  const byKey = new Map<string, IProductCartLine>();
  for (const raw of input) {
    const quantity = Math.floor(Number(raw?.quantity));
    if (!Types.ObjectId.isValid(raw?.pod_id) || !Types.ObjectId.isValid(raw?.product_id)) continue;
    if (!Number.isFinite(quantity) || quantity < 1) continue;
    const line: IProductCartLine = {
      pod_id: new Types.ObjectId(raw.pod_id),
      product_id: new Types.ObjectId(raw.product_id),
      variant_id: String(raw.variant_id ?? '').slice(0, 64),
      quantity: Math.min(MAX_QUANTITY, quantity),
    };
    byKey.set(lineKey(line), line);
  }
  return Array.from(byKey.values()).slice(0, MAX_LINES);
}

/** Order-free, so the same cart synced from a re-sorted device is "unchanged". */
const signatureOf = (lines: IProductCartLine[]): string =>
  createHash('sha1')
    .update(lines.map((line) => `${lineKey(line)}x${line.quantity}`).sort().join('|'))
    .digest('hex');

/** "Name × 2, Other × 1" from the catalogue — never from what a client sent. */
async function itemsText(lines: IProductCartLine[]): Promise<string> {
  const products = await InventoryProductModel.find({
    _id: { $in: lines.map((line) => line.product_id) },
  })
    .select('product_name')
    .lean();
  const names = new Map(products.map((p) => [String(p._id), p.product_name]));
  return lines
    .filter((line) => names.get(String(line.product_id)))
    .map((line) => `${names.get(String(line.product_id))} × ${line.quantity}`)
    .join(', ');
}

/**
 * One reminder. The claim comes first and is conditional on the cart being
 * exactly as the sweep read it, so two runs (or a cart edited mid-sweep) can
 * never mail the same cart twice. A failed send still counts — retrying a
 * broken address every sweep would be the bigger harm.
 */
async function remindOne(cart: CartDoc, now: Date): Promise<boolean> {
  const claimed = await ProductCartModel.findOneAndUpdate(
    { _id: cart._id, mails_sent: cart.mails_sent, signature: cart.signature },
    { $inc: { mails_sent: 1 }, $set: { last_mail_at: now } }
  );
  if (!claimed) return false;

  const user = await UserModel.findOne({
    _id: cart.user_id,
    'metadata.status': 'ACTIVE',
    'metadata.deleted_at': null,
  })
    .select('profile.first_name auth.email')
    .lean();
  const to = user?.auth?.email ?? '';
  if (!to) return false;

  const items = await itemsText(cart.lines);
  if (!items) return false;

  const { mwebUrl } = await getUrlConfigs();
  const result = await sendEmail({
    to,
    subject: 'Your cart is calling',
    template: 'product-cart-reminder',
    category: 'marketing',
    vars: {
      name: user?.profile?.first_name || 'there',
      items,
      item_count: String(cart.lines.reduce((sum, line) => sum + line.quantity, 0)),
      cart_url: `${mwebUrl.replace(/\/+$/, '')}/cart`,
    },
  });
  return !result.skipped;
}

export const productCartService = {
  /**
   * Mirror the signed-in member's device cart. An empty cart removes the
   * mirror (checkout, Clear cart), which is also what stops the reminders. An
   * unchanged cart keeps its schedule, so a relaunch never pushes the next
   * reminder back; a changed one starts it over.
   */
  async syncMine(userId: string, input: ProductCartLineInput[]): Promise<boolean> {
    const user_id = new Types.ObjectId(userId);
    const lines = cleanLines(Array.isArray(input) ? input : []);
    if (lines.length === 0) {
      await ProductCartModel.deleteOne({ user_id });
      return true;
    }
    const signature = signatureOf(lines);
    await ProductCartModel.updateOne(
      { user_id, signature: { $ne: signature } },
      {
        $set: { lines, signature, changed_at: new Date(), mails_sent: 0, last_mail_at: null },
      },
      { upsert: true }
    ).catch((error: { code?: number }) => {
      // Duplicate key = the mirror exists with this very signature: unchanged.
      if (error?.code !== 11000) throw error;
    });
    return true;
  },

  /** Mail every cart whose next reminder is due. Returns how many went out. */
  async runReminderSweep(now: Date = new Date()): Promise<number> {
    if (!(await isFeatureEnabled(PRODUCT_VISIBILITY_FLAG))) return 0;
    const settings = await productCartSettingsService.get();
    if (!settings.email_enabled) return 0;
    const firstDue = new Date(now.getTime() - settings.email_first_delay_hours * HOUR_MS);
    const repeatDue = new Date(now.getTime() - settings.email_repeat_hours * HOUR_MS);
    const due = await ProductCartModel.find({
      $or: [
        { mails_sent: 0, changed_at: { $lte: firstDue } },
        {
          mails_sent: { $gt: 0, $lt: settings.email_max_count },
          last_mail_at: { $lte: repeatDue },
        },
      ],
    })
      .sort({ changed_at: 1 })
      .limit(SWEEP_BATCH)
      .lean<CartDoc[]>();

    let sent = 0;
    for (const cart of due) {
      try {
        if (await remindOne(cart, now)) sent += 1;
      } catch (error) {
        logs.server.warn('product-cart', 'reminder', { error, cart_id: String(cart._id) });
      }
    }
    return sent;
  },
};
