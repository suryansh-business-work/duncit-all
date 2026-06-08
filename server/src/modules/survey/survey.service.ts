import crypto from 'crypto';
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { SurveyModel, SurveyResponseModel, type SurveyKind } from './survey.model';
import { CategoryModel } from '@modules/pods/category/category.model';

const iso = (v: any) => (v instanceof Date ? v.toISOString() : v ?? null);
const oid = (v?: string | null) => (v ? new Types.ObjectId(v) : null);

const pubSurvey = (doc: any, names?: Map<string, string>) => {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  const nameOf = (id: any) => (id && names ? names.get(String(id)) ?? null : null);
  return {
    id: String(o._id),
    kind: o.kind,
    super_category_id: o.super_category_id ? String(o.super_category_id) : null,
    category_id: o.category_id ? String(o.category_id) : null,
    sub_category_id: o.sub_category_id ? String(o.sub_category_id) : null,
    super_category_name: nameOf(o.super_category_id),
    category_name: nameOf(o.category_id),
    sub_category_name: nameOf(o.sub_category_id),
    title: o.title ?? '',
    is_active: o.is_active !== false,
    questions: (o.questions ?? [])
      .slice()
      .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((q: any) => ({
        qid: q.qid,
        type: q.type,
        label: q.label,
        help: q.help ?? null,
        required: !!q.required,
        multi: !!q.multi,
        options: q.options ?? [],
        sort_order: q.sort_order ?? 0,
      })),
    updated_at: iso(o.updated_at),
  };
};

const pubResponse = (doc: any) => {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    kind: o.kind,
    survey_id: o.survey_id ? String(o.survey_id) : null,
    answers: (o.answers ?? []).map((a: any) => ({ qid: a.qid, value: a.value ?? null, values: a.values ?? [] })),
    submitted_at: iso(o.submitted_at),
  };
};

/** Batch-resolve category names for the scope ids referenced across the docs. */
async function categoryNameMap(docs: any[]): Promise<Map<string, string>> {
  const ids = new Set<string>();
  for (const d of docs) {
    for (const k of ['super_category_id', 'category_id', 'sub_category_id'] as const) {
      if (d[k]) ids.add(String(d[k]));
    }
  }
  if (ids.size === 0) return new Map();
  const cats = await CategoryModel.find({ _id: { $in: [...ids] } }).select('name').lean();
  return new Map(cats.map((c: any) => [String(c._id), c.name as string]));
}

interface QuestionInput {
  qid?: string | null;
  type: string;
  label: string;
  help?: string | null;
  required?: boolean | null;
  multi?: boolean | null;
  options?: string[] | null;
}

interface SurveyScope {
  super_category_id?: string | null;
  category_id?: string | null;
  sub_category_id?: string | null;
}

interface UpsertInput extends SurveyScope {
  kind?: SurveyKind;
  title?: string | null;
  is_active?: boolean | null;
  questions: QuestionInput[];
}

/** Normalise + validate questions; assigns a qid where missing. */
const normaliseQuestions = (questions: QuestionInput[]) => {
  const out = (questions ?? []).map((q, idx) => ({
    qid: q.qid || crypto.randomUUID(),
    type: q.type,
    label: String(q.label ?? '').trim(),
    help: q.help ?? null,
    required: !!q.required,
    multi: !!q.multi,
    options: (q.options ?? []).map((o) => String(o).trim()).filter(Boolean),
    sort_order: idx,
  }));
  for (const q of out) {
    if (!q.label) throw new GraphQLError('Every question needs a label', { extensions: { code: 'BAD_USER_INPUT' } });
    if (q.type === 'MCQ' && q.options.length === 0) {
      throw new GraphQLError(`MCQ "${q.label}" needs at least one option`, { extensions: { code: 'BAD_USER_INPUT' } });
    }
  }
  return out;
};

export const surveyService = {
  /** Onboarding list — surveys for a kind, optionally narrowed by scope/search. */
  async list(filter: { kind?: SurveyKind } & SurveyScope & { search?: string | null } = {}) {
    const q: any = {};
    if (filter.kind) q.kind = filter.kind;
    if (filter.super_category_id) q.super_category_id = oid(filter.super_category_id);
    if (filter.category_id) q.category_id = oid(filter.category_id);
    if (filter.sub_category_id) q.sub_category_id = oid(filter.sub_category_id);
    if (filter.search) {
      q.title = new RegExp(filter.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }
    const docs = await SurveyModel.find(q).sort({ updated_at: -1 }).lean();
    const names = await categoryNameMap(docs);
    return docs.map((d) => pubSurvey(d, names));
  },

  /** Builder load by id. */
  async getById(id: string) {
    const doc = await SurveyModel.findById(id).lean();
    if (!doc) return null;
    return pubSurvey(doc, await categoryNameMap([doc]));
  },

  /**
   * Resolve the single survey to show for a user's chosen taxonomy slot.
   * Cascading fallback: a survey matches when every scope field it *sets* equals
   * the provided value (null scope = wildcard); the most specific match wins.
   * Returns null when nothing matches or the match has no questions.
   */
  async activeFor(args: { kind: SurveyKind } & SurveyScope) {
    const superId = args.super_category_id || null;
    const categoryId = args.category_id || null;
    const subId = args.sub_category_id || null;
    const docs = await SurveyModel.find({ kind: args.kind, is_active: { $ne: false } }).lean();
    const matches = docs.filter((s: any) => {
      if (s.super_category_id && String(s.super_category_id) !== superId) return false;
      if (s.category_id && String(s.category_id) !== categoryId) return false;
      if (s.sub_category_id && String(s.sub_category_id) !== subId) return false;
      return (s.questions ?? []).length > 0;
    });
    if (matches.length === 0) return null;
    const score = (s: any) =>
      (s.super_category_id ? 1 : 0) + (s.category_id ? 1 : 0) + (s.sub_category_id ? 1 : 0);
    matches.sort((a: any, b: any) => score(b) - score(a) || +new Date(b.updated_at) - +new Date(a.updated_at));
    return pubSurvey(matches[0]);
  },

  /** Back-compat: the kind-level default survey (all scope null). */
  async active(kind: SurveyKind) {
    return this.activeFor({ kind });
  },

  /** Create a survey for a kind + taxonomy slot. */
  async create(input: UpsertInput, by?: string | null) {
    if (!input.kind) throw new GraphQLError('Survey kind is required', { extensions: { code: 'BAD_USER_INPUT' } });
    const questions = normaliseQuestions(input.questions);
    try {
      const doc = await SurveyModel.create({
        kind: input.kind,
        super_category_id: oid(input.super_category_id ?? null),
        category_id: oid(input.category_id ?? null),
        sub_category_id: oid(input.sub_category_id ?? null),
        title: input.title ?? '',
        is_active: input.is_active !== false,
        questions,
        updated_by: by ?? null,
      });
      return pubSurvey(doc, await categoryNameMap([doc]));
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new GraphQLError(
          `A ${input.kind} survey already exists for this exact category slot — edit that one instead of creating a new one.`,
          { extensions: { code: 'CONFLICT' } }
        );
      }
      throw err;
    }
  },

  /**
   * Reconcile survey indexes with the current schema. Drops the legacy
   * `kind_1` (surveys) and `user_id_1_kind_1` (responses) unique indexes that
   * Mongoose leaves behind from the pre-scope schema, then builds the compound
   * indexes. Run on boot so adding a 2nd survey per kind works without the
   * manual `migrate:survey-scope` step. Idempotent.
   */
  async syncIndexes() {
    await SurveyModel.syncIndexes();
    await SurveyResponseModel.syncIndexes();
  },

  /** Update an existing survey by id (scope + questions). */
  async update(id: string, input: UpsertInput, by?: string | null) {
    const doc = await SurveyModel.findById(id);
    if (!doc) throw new GraphQLError('Survey not found', { extensions: { code: 'NOT_FOUND' } });
    doc.questions = normaliseQuestions(input.questions) as any;
    if (input.title != null) doc.title = input.title;
    if (input.is_active != null) doc.is_active = input.is_active;
    if ('super_category_id' in input) doc.super_category_id = oid(input.super_category_id ?? null);
    if ('category_id' in input) doc.category_id = oid(input.category_id ?? null);
    if ('sub_category_id' in input) doc.sub_category_id = oid(input.sub_category_id ?? null);
    doc.updated_by = by ?? null;
    try {
      await doc.save();
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new GraphQLError('A survey already exists for this category slot', { extensions: { code: 'CONFLICT' } });
      }
      throw err;
    }
    return pubSurvey(doc, await categoryNameMap([doc]));
  },

  async remove(id: string) {
    const doc = await SurveyModel.findByIdAndDelete(id);
    if (!doc) throw new GraphQLError('Survey not found', { extensions: { code: 'NOT_FOUND' } });
    return true;
  },

  async myResponse(userId: string, surveyId: string) {
    return pubResponse(
      await SurveyResponseModel.findOne({ user_id: new Types.ObjectId(userId), survey_id: new Types.ObjectId(surveyId) })
    );
  },

  /** Upsert the current user's response for a survey (kind derived from the survey). */
  async submit(userId: string, surveyId: string, answers: { qid: string; value?: string | null; values?: string[] | null }[]) {
    const survey = await SurveyModel.findById(surveyId).select('kind').lean();
    if (!survey) throw new GraphQLError('Survey not found', { extensions: { code: 'NOT_FOUND' } });
    const clean = (answers ?? []).map((a) => ({ qid: a.qid, value: a.value ?? null, values: a.values ?? [] }));
    const doc = await SurveyResponseModel.findOneAndUpdate(
      { user_id: new Types.ObjectId(userId), survey_id: new Types.ObjectId(surveyId) },
      { $set: { kind: (survey as any).kind, answers: clean, submitted_at: new Date() } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return pubResponse(doc);
  },

  /**
   * Admin read for a user: each response joined with its survey's question
   * labels so the UI can render label → answer without extra lookups. Falls
   * back to matching by `kind` for legacy responses missing `survey_id`.
   */
  async userResponses(userId: string) {
    const responses = await SurveyResponseModel.find({ user_id: new Types.ObjectId(userId) }).lean();
    const surveys = await SurveyModel.find({}).lean();
    const byId = new Map(surveys.map((s: any) => [String(s._id), s]));
    const byKind = new Map(surveys.map((s: any) => [s.kind, s]));
    return responses.map((r: any) => {
      const survey: any = (r.survey_id && byId.get(String(r.survey_id))) || byKind.get(r.kind);
      const qmap = new Map((survey?.questions ?? []).map((q: any) => [q.qid, q]));
      const items = (r.answers ?? []).map((a: any) => {
        const q: any = qmap.get(a.qid);
        const answer = (a.values && a.values.length ? a.values.join(', ') : a.value) ?? '';
        return { qid: a.qid, label: q?.label ?? a.qid, type: q?.type ?? 'TEXT', answer };
      });
      return { kind: r.kind, title: survey?.title ?? '', submitted_at: iso(r.submitted_at), items };
    });
  },
};
