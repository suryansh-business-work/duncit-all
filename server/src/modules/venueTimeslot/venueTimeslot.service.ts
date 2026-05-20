import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import {
  VenueTimeslotBlockModel,
  VenueTimeslotOverrideModel,
  VenueTimeslotTemplateModel,
  type IVenueTimeslotBlock,
  type IVenueTimeslotOverride,
  type IVenueTimeslotTemplate,
} from './venueTimeslot.model';
import {
  blockInputSchema,
  overrideInputSchema,
  templateInputSchema,
} from './venueTimeslot.validator';
import { VenueModel } from '../venue/venue.model';

const toTemplate = (t: IVenueTimeslotTemplate) => ({
  id: String(t._id),
  venue_id: String(t.venue_id),
  label: t.label ?? '',
  duration_minutes: t.duration_minutes,
  capacity: t.capacity,
  start_time: t.start_time,
  end_time: t.end_time,
  recurrence_kind: t.recurrence_kind,
  weekdays: t.weekdays ?? [],
  month_days: t.month_days ?? [],
  month_nth_weekday: t.month_nth_weekday ?? null,
  specific_dates: (t.specific_dates ?? []).map((d) => new Date(d).toISOString()),
  valid_from: t.valid_from ? new Date(t.valid_from).toISOString() : null,
  valid_until: t.valid_until ? new Date(t.valid_until).toISOString() : null,
  timezone: t.timezone ?? 'Asia/Kolkata',
  is_active: !!t.is_active,
  created_at: t.created_at?.toISOString?.() ?? '',
  updated_at: t.updated_at?.toISOString?.() ?? '',
});

const toBlock = (b: IVenueTimeslotBlock) => ({
  id: String(b._id),
  venue_id: String(b.venue_id),
  template_id: b.template_id ? String(b.template_id) : null,
  from: new Date(b.from).toISOString(),
  to: new Date(b.to).toISOString(),
  reason: b.reason,
  created_at: b.created_at?.toISOString?.() ?? '',
});

const toOverride = (o: IVenueTimeslotOverride) => ({
  id: String(o._id),
  venue_id: String(o.venue_id),
  template_id: String(o.template_id),
  occurrence_date: new Date(o.occurrence_date).toISOString(),
  capacity_override: o.capacity_override ?? null,
  is_cancelled: !!o.is_cancelled,
  note: o.note ?? '',
});

async function assertVenueAccess(venueId: string, userId: string, isAdmin: boolean) {
  const v = await VenueModel.findById(venueId);
  if (!v) throw new GraphQLError('Venue not found', { extensions: { code: 'NOT_FOUND' } });
  if (!isAdmin && String(v.owner_user_id) !== String(userId)) {
    throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
  }
  return v;
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function hhmmToMinutes(value: string): number {
  const [hh, mm] = value.split(':').map((p) => parseInt(p, 10));
  return hh * 60 + mm;
}

function dateKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
    d.getUTCDate(),
  ).padStart(2, '0')}`;
}

function templateMatchesDate(template: IVenueTimeslotTemplate, date: Date): boolean {
  if (template.valid_from && date < new Date(template.valid_from)) return false;
  if (template.valid_until && date > new Date(template.valid_until)) return false;
  if (template.recurrence_kind === 'WEEKLY') {
    return template.weekdays.includes(date.getUTCDay());
  }
  if (template.recurrence_kind === 'MONTHLY') {
    const dayOfMonth = date.getUTCDate();
    if (template.month_days?.length) return template.month_days.includes(dayOfMonth);
    if (template.month_nth_weekday) {
      const { nth, weekday } = template.month_nth_weekday;
      if (date.getUTCDay() !== weekday) return false;
      const occurrenceIndex = Math.ceil(dayOfMonth / 7);
      if (nth === -1) {
        const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
        const lastWeekdayMatch =
          Math.ceil(last.getUTCDate() / 7) === occurrenceIndex && last.getUTCDay() === weekday;
        return lastWeekdayMatch;
      }
      return occurrenceIndex === nth;
    }
    return false;
  }
  if (template.recurrence_kind === 'SPECIFIC_DATES') {
    return template.specific_dates.some((d) => dateKey(new Date(d)) === dateKey(date));
  }
  return false;
}

export const venueTimeslotService = {
  async listTemplates(venueId: string, userId: string, isAdmin: boolean) {
    await assertVenueAccess(venueId, userId, isAdmin);
    const docs = await VenueTimeslotTemplateModel.find({
      venue_id: new Types.ObjectId(venueId),
    }).sort({ created_at: -1 });
    return docs.map(toTemplate);
  },

  async listBlocks(venueId: string, userId: string, isAdmin: boolean, from?: string, to?: string) {
    await assertVenueAccess(venueId, userId, isAdmin);
    const filter: any = { venue_id: new Types.ObjectId(venueId) };
    const fromDate = parseDate(from);
    const toDate = parseDate(to);
    if (fromDate || toDate) {
      filter.$and = [];
      if (fromDate) filter.$and.push({ to: { $gte: fromDate } });
      if (toDate) filter.$and.push({ from: { $lte: toDate } });
    }
    const docs = await VenueTimeslotBlockModel.find(filter).sort({ from: 1 });
    return docs.map(toBlock);
  },

  async listOverrides(venueId: string, userId: string, isAdmin: boolean, from?: string, to?: string) {
    await assertVenueAccess(venueId, userId, isAdmin);
    const filter: any = { venue_id: new Types.ObjectId(venueId) };
    const fromDate = parseDate(from);
    const toDate = parseDate(to);
    if (fromDate || toDate) {
      filter.occurrence_date = {};
      if (fromDate) filter.occurrence_date.$gte = fromDate;
      if (toDate) filter.occurrence_date.$lte = toDate;
    }
    const docs = await VenueTimeslotOverrideModel.find(filter).sort({ occurrence_date: 1 });
    return docs.map(toOverride);
  },

  async createTemplate(venueId: string, userId: string, isAdmin: boolean, input: any) {
    await assertVenueAccess(venueId, userId, isAdmin);
    const data = await templateInputSchema.validate(input, { abortEarly: false });
    const doc = await VenueTimeslotTemplateModel.create({
      ...data,
      venue_id: new Types.ObjectId(venueId),
      specific_dates: (data.specific_dates ?? []).map((d) => new Date(d)),
      valid_from: data.valid_from ? new Date(data.valid_from) : null,
      valid_until: data.valid_until ? new Date(data.valid_until) : null,
      created_by: new Types.ObjectId(userId),
    });
    return toTemplate(doc);
  },

  async updateTemplate(templateId: string, userId: string, isAdmin: boolean, input: any) {
    const existing = await VenueTimeslotTemplateModel.findById(templateId);
    if (!existing) throw new GraphQLError('Template not found', { extensions: { code: 'NOT_FOUND' } });
    await assertVenueAccess(String(existing.venue_id), userId, isAdmin);
    const data = await templateInputSchema.validate(input, { abortEarly: false });
    Object.assign(existing, data, {
      specific_dates: (data.specific_dates ?? []).map((d) => new Date(d)),
      valid_from: data.valid_from ? new Date(data.valid_from) : null,
      valid_until: data.valid_until ? new Date(data.valid_until) : null,
    });
    await existing.save();
    return toTemplate(existing);
  },

  async deleteTemplate(templateId: string, userId: string, isAdmin: boolean) {
    const existing = await VenueTimeslotTemplateModel.findById(templateId);
    if (!existing) return false;
    await assertVenueAccess(String(existing.venue_id), userId, isAdmin);
    await VenueTimeslotTemplateModel.deleteOne({ _id: existing._id });
    return true;
  },

  async setTemplateActive(templateId: string, userId: string, isAdmin: boolean, active: boolean) {
    const existing = await VenueTimeslotTemplateModel.findById(templateId);
    if (!existing) throw new GraphQLError('Template not found', { extensions: { code: 'NOT_FOUND' } });
    await assertVenueAccess(String(existing.venue_id), userId, isAdmin);
    existing.is_active = active;
    await existing.save();
    return toTemplate(existing);
  },

  async blockTimeslot(venueId: string, userId: string, isAdmin: boolean, input: any) {
    await assertVenueAccess(venueId, userId, isAdmin);
    const data = await blockInputSchema.validate(input, { abortEarly: false });
    const doc = await VenueTimeslotBlockModel.create({
      venue_id: new Types.ObjectId(venueId),
      template_id: data.template_id ? new Types.ObjectId(data.template_id) : null,
      from: new Date(data.from),
      to: new Date(data.to),
      reason: data.reason,
      created_by: new Types.ObjectId(userId),
    });
    return toBlock(doc);
  },

  async unblockTimeslot(blockId: string, userId: string, isAdmin: boolean) {
    const existing = await VenueTimeslotBlockModel.findById(blockId);
    if (!existing) return false;
    await assertVenueAccess(String(existing.venue_id), userId, isAdmin);
    await VenueTimeslotBlockModel.deleteOne({ _id: existing._id });
    return true;
  },

  async overrideCapacity(venueId: string, userId: string, isAdmin: boolean, input: any) {
    await assertVenueAccess(venueId, userId, isAdmin);
    const data = await overrideInputSchema.validate(input, { abortEarly: false });
    const occurrence = new Date(data.occurrence_date);
    const doc = await VenueTimeslotOverrideModel.findOneAndUpdate(
      {
        venue_id: new Types.ObjectId(venueId),
        template_id: new Types.ObjectId(data.template_id),
        occurrence_date: occurrence,
      },
      {
        $set: {
          capacity_override: data.capacity_override ?? null,
          is_cancelled: !!data.is_cancelled,
          note: data.note ?? '',
        },
        $setOnInsert: {
          venue_id: new Types.ObjectId(venueId),
          template_id: new Types.ObjectId(data.template_id),
          occurrence_date: occurrence,
        },
      },
      { new: true, upsert: true },
    );
    return toOverride(doc!);
  },

  async clearOverride(overrideId: string, userId: string, isAdmin: boolean) {
    const existing = await VenueTimeslotOverrideModel.findById(overrideId);
    if (!existing) return false;
    await assertVenueAccess(String(existing.venue_id), userId, isAdmin);
    await VenueTimeslotOverrideModel.deleteOne({ _id: existing._id });
    return true;
  },

  async listInstances(
    venueId: string,
    userId: string,
    isAdmin: boolean,
    from: string,
    to: string,
  ) {
    await assertVenueAccess(venueId, userId, isAdmin);
    const fromDate = parseDate(from);
    const toDate = parseDate(to);
    if (!fromDate || !toDate || toDate <= fromDate) {
      throw new GraphQLError('Invalid date range', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const spanDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (24 * 3600 * 1000));
    if (spanDays > 120) {
      throw new GraphQLError('Date range cannot exceed 120 days', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    const venueObjectId = new Types.ObjectId(venueId);
    const [templates, blocks, overrides] = await Promise.all([
      VenueTimeslotTemplateModel.find({ venue_id: venueObjectId, is_active: true }),
      VenueTimeslotBlockModel.find({
        venue_id: venueObjectId,
        $or: [{ to: { $gte: fromDate } }, { from: { $lte: toDate } }],
      }),
      VenueTimeslotOverrideModel.find({
        venue_id: venueObjectId,
        occurrence_date: { $gte: fromDate, $lte: toDate },
      }),
    ]);

    const instances: ReturnType<typeof buildInstance>[] = [];

    for (let cursor = new Date(fromDate); cursor <= toDate; cursor = addDay(cursor)) {
      for (const template of templates) {
        if (!templateMatchesDate(template, cursor)) continue;
        const startAt = mergeDateTime(cursor, template.start_time);
        const endAt = new Date(startAt.getTime() + template.duration_minutes * 60_000);

        const matchingOverride = overrides.find(
          (o) =>
            String(o.template_id) === String(template._id) &&
            dateKey(new Date(o.occurrence_date)) === dateKey(cursor),
        );

        const blockedBy = blocks.find(
          (b) =>
            (!b.template_id || String(b.template_id) === String(template._id)) &&
            startAt < new Date(b.to) &&
            endAt > new Date(b.from),
        );

        instances.push(
          buildInstance({
            templateId: String(template._id),
            label: template.label || `${template.start_time} slot`,
            startAt,
            endAt,
            baseCapacity: template.capacity,
            override: matchingOverride ?? null,
            block: blockedBy ?? null,
          }),
        );
      }
    }

    instances.sort((a, b) => (a.start_at < b.start_at ? -1 : 1));
    return instances;
  },
};

function buildInstance(opts: {
  templateId: string;
  label: string;
  startAt: Date;
  endAt: Date;
  baseCapacity: number;
  override: IVenueTimeslotOverride | null;
  block: IVenueTimeslotBlock | null;
}) {
  const capacity =
    opts.override?.capacity_override != null && opts.override.capacity_override >= 0
      ? opts.override.capacity_override
      : opts.baseCapacity;
  return {
    template_id: opts.templateId,
    label: opts.label,
    start_at: opts.startAt.toISOString(),
    end_at: opts.endAt.toISOString(),
    capacity,
    is_blocked: !!opts.block,
    block_reason: opts.block?.reason ?? null,
    is_cancelled: !!opts.override?.is_cancelled,
    note: opts.override?.note ?? null,
  };
}

function addDay(d: Date): Date {
  const next = new Date(d);
  next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

function mergeDateTime(date: Date, hhmm: string): Date {
  const minutes = hhmmToMinutes(hhmm);
  const merged = new Date(date);
  merged.setUTCHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return merged;
}
