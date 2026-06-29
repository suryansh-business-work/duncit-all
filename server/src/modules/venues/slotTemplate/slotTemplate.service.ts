import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { SlotTemplateModel, type ISlotTemplate } from './slotTemplate.model';

const fail = (code: string, message: string): never => {
  throw new GraphQLError(message, { extensions: { code } });
};

const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const clampPrice = (value: unknown) => Math.min(1_000_000, Math.max(0, Math.round(Number(value) || 0)));

const toPub = (t: ISlotTemplate) => ({
  id: String(t._id),
  venue_id: t.venue_id ? String(t.venue_id) : null,
  name: t.name,
  description: t.description ?? '',
  category: t.category ?? '',
  visibility: t.visibility,
  is_default: t.is_default ?? false,
  config: {
    weekdays: [...(t.config?.weekdays ?? [])].sort((a, b) => a - b),
    start_time: t.config?.start_time ?? '09:00',
    end_time: t.config?.end_time ?? '10:00',
    default_price: t.config?.default_price ?? 0,
    per_day_price: (t.config?.per_day_price ?? []).map((p) => ({ weekday: p.weekday, price: p.price })),
    skip_weekly_off: t.config?.skip_weekly_off ?? true,
    skip_holidays: t.config?.skip_holidays ?? true,
  },
  created_at: t.created_at?.toISOString?.() ?? '',
  updated_at: t.updated_at?.toISOString?.() ?? '',
});

function normalizeConfig(input: any) {
  const weekdays = (input.weekdays as unknown[]).map((d) => Math.trunc(Number(d)));
  if (weekdays.length === 0 || weekdays.some((d) => !Number.isFinite(d) || d < 0 || d > 6)) {
    fail('BAD_USER_INPUT', 'config.weekdays must be 1+ integers in 0..6');
  }
  if (!HHMM_RE.test(input.start_time) || !HHMM_RE.test(input.end_time)) {
    fail('BAD_USER_INPUT', 'config times must be HH:mm (24-hour)');
  }
  if (toMinutes(input.end_time) <= toMinutes(input.start_time)) {
    fail('BAD_USER_INPUT', 'config end_time must be after start_time');
  }
  const perDay = (input.per_day_price ?? []).map((p: any) => {
    const weekday = Math.trunc(Number(p.weekday));
    if (!Number.isFinite(weekday) || weekday < 0 || weekday > 6) {
      fail('BAD_USER_INPUT', 'per_day_price.weekday must be 0..6');
    }
    return { weekday, price: clampPrice(p.price) };
  });
  return {
    weekdays: [...new Set(weekdays)].sort((a, b) => a - b),
    start_time: input.start_time,
    end_time: input.end_time,
    default_price: clampPrice(input.default_price),
    per_day_price: perDay,
    skip_weekly_off: input.skip_weekly_off ?? true,
    skip_holidays: input.skip_holidays ?? true,
  };
}

async function loadOwned(userId: string, id: string) {
  if (!Types.ObjectId.isValid(id)) fail('BAD_USER_INPUT', 'Invalid template id');
  const t = await SlotTemplateModel.findById(id);
  if (!t) fail('NOT_FOUND', 'Template not found');
  if (String(t!.owner_user_id) !== String(userId)) fail('FORBIDDEN', 'Not your template');
  return t!;
}

export const slotTemplateService = {
  async listMine(userId: string, venueId?: string | null) {
    const q: any = { owner_user_id: new Types.ObjectId(userId) };
    if (venueId && Types.ObjectId.isValid(venueId)) q.venue_id = new Types.ObjectId(venueId);
    const docs = await SlotTemplateModel.find(q).sort({ is_default: -1, updated_at: -1 }).limit(200);
    return docs.map(toPub);
  },

  async create(userId: string, input: any) {
    const name = String(input.name ?? '').trim();
    if (!name) fail('BAD_USER_INPUT', 'Template name is required');
    const config = normalizeConfig(input.config);
    const isDefault = Boolean(input.is_default);
    if (isDefault) {
      await SlotTemplateModel.updateMany(
        { owner_user_id: new Types.ObjectId(userId) },
        { $set: { is_default: false } }
      );
    }
    const doc = await SlotTemplateModel.create({
      owner_user_id: new Types.ObjectId(userId),
      venue_id: input.venue_id && Types.ObjectId.isValid(input.venue_id) ? new Types.ObjectId(input.venue_id) : null,
      name,
      description: input.description ?? '',
      category: input.category ?? '',
      visibility: input.visibility === 'PUBLIC' ? 'PUBLIC' : 'PRIVATE',
      is_default: isDefault,
      config,
    });
    return toPub(doc);
  },

  async remove(userId: string, id: string) {
    const t = await loadOwned(userId, id);
    await t.deleteOne();
    return true;
  },

  async setDefault(userId: string, id: string) {
    const t = await loadOwned(userId, id);
    await SlotTemplateModel.updateMany(
      { owner_user_id: new Types.ObjectId(userId) },
      { $set: { is_default: false } }
    );
    t.is_default = true;
    await t.save();
    return toPub(t);
  },
};
