import crypto from 'crypto';
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { SurveyModel, SurveyResponseModel, type SurveyKind } from './survey.model';

const iso = (v: any) => (v instanceof Date ? v.toISOString() : v ?? null);

const pubSurvey = (doc: any) => {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    kind: o.kind,
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
    answers: (o.answers ?? []).map((a: any) => ({ qid: a.qid, value: a.value ?? null, values: a.values ?? [] })),
    submitted_at: iso(o.submitted_at),
  };
};

interface QuestionInput {
  qid?: string | null;
  type: string;
  label: string;
  help?: string | null;
  required?: boolean | null;
  multi?: boolean | null;
  options?: string[] | null;
}

export const surveyService = {
  /** Builder/admin read — returns the (possibly empty) survey for a kind. */
  async get(kind: SurveyKind) {
    return pubSurvey(await SurveyModel.findOne({ kind }));
  },

  /** Public read for gating — only when active and it has questions. */
  async active(kind: SurveyKind) {
    const doc = await SurveyModel.findOne({ kind, is_active: { $ne: false } });
    const pub = pubSurvey(doc);
    return pub && pub.questions.length ? pub : null;
  },

  /** Create/replace the survey for a kind (builder). Assigns qids as needed. */
  async upsert(kind: SurveyKind, input: { title?: string | null; is_active?: boolean | null; questions: QuestionInput[] }, by?: string | null) {
    const questions = (input.questions ?? []).map((q, idx) => ({
      qid: q.qid || crypto.randomUUID(),
      type: q.type,
      label: String(q.label ?? '').trim(),
      help: q.help ?? null,
      required: !!q.required,
      multi: !!q.multi,
      options: (q.options ?? []).map((o) => String(o).trim()).filter(Boolean),
      sort_order: idx,
    }));
    for (const q of questions) {
      if (!q.label) throw new GraphQLError('Every question needs a label', { extensions: { code: 'BAD_USER_INPUT' } });
      if (q.type === 'MCQ' && q.options.length === 0) {
        throw new GraphQLError(`MCQ "${q.label}" needs at least one option`, { extensions: { code: 'BAD_USER_INPUT' } });
      }
    }
    const doc = await SurveyModel.findOneAndUpdate(
      { kind },
      { $set: { title: input.title ?? '', is_active: input.is_active !== false, questions, updated_by: by ?? null } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return pubSurvey(doc);
  },

  async myResponse(userId: string, kind: SurveyKind) {
    return pubResponse(await SurveyResponseModel.findOne({ user_id: new Types.ObjectId(userId), kind }));
  },

  /** Upsert the current user's response for a kind. */
  async submit(userId: string, kind: SurveyKind, answers: { qid: string; value?: string | null; values?: string[] | null }[]) {
    const clean = (answers ?? []).map((a) => ({ qid: a.qid, value: a.value ?? null, values: a.values ?? [] }));
    const doc = await SurveyResponseModel.findOneAndUpdate(
      { user_id: new Types.ObjectId(userId), kind },
      { $set: { answers: clean, submitted_at: new Date() } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return pubResponse(doc);
  },

  /**
   * Admin read for a user: each kind's response joined with the survey's
   * question labels so the UI can render label → answer without extra lookups.
   */
  async userResponses(userId: string) {
    const responses = await SurveyResponseModel.find({ user_id: new Types.ObjectId(userId) }).lean();
    const surveys = await SurveyModel.find({}).lean();
    const byKind = new Map(surveys.map((s: any) => [s.kind, s]));
    return responses.map((r: any) => {
      const survey: any = byKind.get(r.kind);
      const qmap = new Map((survey?.questions ?? []).map((q: any) => [q.qid, q]));
      const items = (r.answers ?? []).map((a: any) => {
        const q: any = qmap.get(a.qid);
        const answer = (a.values && a.values.length ? a.values.join(', ') : a.value) ?? '';
        return { qid: a.qid, label: q?.label ?? a.qid, type: q?.type ?? 'TEXT', answer };
      });
      return { kind: r.kind, submitted_at: iso(r.submitted_at), items };
    });
  },
};
