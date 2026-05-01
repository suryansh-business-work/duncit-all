import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { FaqModel, type IFaq } from './faq.model';
import { CategoryModel } from '../category/category.model';

const toPub = (f: IFaq) => ({
  id: String(f._id),
  super_category_id: f.super_category_id ? String(f.super_category_id) : null,
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

export const faqService = {
  async list(filter?: { super_category_id?: string; is_active?: boolean; search?: string }) {
    const q: any = {};
    if (filter?.super_category_id) q.super_category_id = new Types.ObjectId(filter.super_category_id);
    if (typeof filter?.is_active === 'boolean') q.is_active = filter.is_active;
    if (filter?.search) {
      const r = new RegExp(filter.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      q.$or = [{ question: r }, { answer: r }];
    }
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
    const faqs = await FaqModel.find({ is_active: true }).sort({ sort_order: 1, created_at: -1 });
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
};
