import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { FaqModel, type FaqAudience, type IFaq, type PartnerFaqTopic } from './faq.model';
import { CategoryModel } from '../category/category.model';

const toPub = (f: IFaq) => ({
  id: String(f._id),
  super_category_id: f.super_category_id ? String(f.super_category_id) : null,
  audience: f.audience ?? 'APP',
  partner_topic: f.partner_topic ?? null,
  question: f.question,
  answer: f.answer,
  is_active: f.is_active,
  sort_order: f.sort_order,
  created_at: f.created_at.toISOString(),
  updated_at: f.updated_at.toISOString(),
});

async function assertSuperCategory(id?: string | null) {
  if (!id) return;
  const cat = await CategoryModel.findById(id).select('level');
  if (!cat) throw new GraphQLError('Super category not found', { extensions: { code: 'NOT_FOUND' } });
  if (cat.level !== 'SUPER')
    throw new GraphQLError('Selected category is not a SUPER category', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
}

function normalizeAudience(input: any): { audience: FaqAudience; partner_topic: PartnerFaqTopic | null } {
  const audience = (input.audience ?? 'APP') as FaqAudience;
  const partnerTopic = input.partner_topic ?? null;
  if (audience === 'PARTNERS' && !partnerTopic) {
    throw new GraphQLError('Partner FAQ topic is required', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  return { audience, partner_topic: audience === 'PARTNERS' ? partnerTopic : null };
}

export const faqService = {
  async list(filter?: { super_category_id?: string; audience?: FaqAudience; partner_topic?: PartnerFaqTopic; is_active?: boolean; search?: string }) {
    const q: any = {};
    const and: any[] = [];
    if (filter?.super_category_id) q.super_category_id = new Types.ObjectId(filter.super_category_id);
    if (filter?.audience === 'APP') and.push({ $or: [{ audience: 'APP' }, { audience: { $exists: false } }] });
    if (filter?.audience === 'PARTNERS') q.audience = 'PARTNERS';
    if (filter?.partner_topic) q.partner_topic = filter.partner_topic;
    if (typeof filter?.is_active === 'boolean') q.is_active = filter.is_active;
    if (filter?.search) {
      const r = new RegExp(filter.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      and.push({ $or: [{ question: r }, { answer: r }] });
    }
    if (and.length) q.$and = and;
    const docs = await FaqModel.find(q).sort({ sort_order: 1, created_at: -1 });
    return docs.map(toPub);
  },

  async getById(id: string) {
    const doc = await FaqModel.findById(id);
    return doc ? toPub(doc) : null;
  },

  async create(input: any) {
    if (!input.question?.trim() || !input.answer?.trim())
      throw new GraphQLError('Question and answer are required', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    await assertSuperCategory(input.super_category_id);
    const doc = await FaqModel.create({
      super_category_id: input.super_category_id ? new Types.ObjectId(input.super_category_id) : null,
      ...normalizeAudience(input),
      question: input.question.trim(),
      answer: input.answer.trim(),
      is_active: input.is_active ?? true,
      sort_order: input.sort_order ?? 0,
    });
    return toPub(doc);
  },

  async update(id: string, input: any) {
    const doc = await FaqModel.findById(id);
    if (!doc) throw new GraphQLError('Faq not found', { extensions: { code: 'NOT_FOUND' } });
    if (input.super_category_id !== undefined) {
      await assertSuperCategory(input.super_category_id);
      doc.super_category_id = input.super_category_id ? new Types.ObjectId(input.super_category_id) : null;
    }
    if (input.audience !== undefined || input.partner_topic !== undefined) Object.assign(doc, normalizeAudience({ audience: input.audience ?? doc.audience, partner_topic: input.partner_topic ?? doc.partner_topic }));
    if (input.question !== undefined) doc.question = input.question.trim();
    if (input.answer !== undefined) doc.answer = input.answer.trim();
    if (input.is_active !== undefined) doc.is_active = input.is_active;
    if (input.sort_order !== undefined) doc.sort_order = input.sort_order;
    await doc.save();
    return toPub(doc);
  },

  async remove(id: string) {
    const r = await FaqModel.findByIdAndDelete(id);
    return !!r;
  },

  async publicGroups() {
    const supers = await CategoryModel.find({ level: 'SUPER', is_active: true }).sort({ sort_order: 1 });
    const faqs = await FaqModel.find({ is_active: true, audience: { $ne: 'PARTNERS' } }).sort({ sort_order: 1, created_at: -1 });
    const bySuper = new Map<string, IFaq[]>();
    const generic: IFaq[] = [];
    for (const f of faqs) {
      if (!f.super_category_id) generic.push(f);
      else {
        const k = String(f.super_category_id);
        if (!bySuper.has(k)) bySuper.set(k, []);
        bySuper.get(k)!.push(f);
      }
    }
    const groups: { super_category: any; faqs: any[] }[] = [];
    for (const sc of supers) {
      const list = bySuper.get(String(sc._id)) || [];
      if (list.length === 0) continue;
      groups.push({ super_category: sc, faqs: list.map(toPub) });
    }
    if (generic.length > 0) {
      groups.unshift({ super_category: null, faqs: generic.map(toPub) });
    }
    return groups;
  },

  async publicPartnerFaqs(topic?: PartnerFaqTopic | null) {
    const q: any = { is_active: true, audience: 'PARTNERS' };
    if (topic) q.partner_topic = topic;
    const docs = await FaqModel.find(q).sort({ partner_topic: 1, sort_order: 1, created_at: -1 });
    return docs.map(toPub);
  },
};
