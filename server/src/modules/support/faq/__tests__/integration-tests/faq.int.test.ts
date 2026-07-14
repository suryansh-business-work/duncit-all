import { faqService } from '../../faq.service';
import { FaqModel } from '../../faq.model';
import { faqSubmissionService } from '../../faqSubmission.service';
import { FaqSubmissionModel } from '../../faqSubmission.model';
import { CategoryModel } from '@modules/pods/category/category.model';

describe('faqService integration', () => {
  it('creates, lists, fetches, updates and removes a faq', async () => {
    const created = await faqService.create({ question: 'How to join?', answer: 'Tap join.' });
    expect(created.id).toBeTruthy();
    expect(created.audience).toBe('APP');

    const list = await faqService.list();
    expect(list).toHaveLength(1);

    const fetched = await faqService.getById(created.id);
    expect(fetched?.question).toBe('How to join?');

    const updated = await faqService.update(created.id, { answer: 'Tap the join button.' });
    expect(updated.answer).toBe('Tap the join button.');

    const removed = await faqService.remove(created.id);
    expect(removed).toBe(true);
    expect(await FaqModel.countDocuments()).toBe(0);
  });

  it('filters by search text and active flag', async () => {
    await faqService.create({ question: 'Refund policy', answer: 'Within 24h', is_active: true });
    await faqService.create({ question: 'Hidden one', answer: 'nope', is_active: false });

    const search = await faqService.list({ search: 'refund' });
    expect(search).toHaveLength(1);
    expect(search[0].question).toBe('Refund policy');

    const active = await faqService.list({ is_active: false });
    expect(active).toHaveLength(1);
    expect(active[0].question).toBe('Hidden one');
  });

  it('serves the faqsTable page with search, filters, sort and paging', async () => {
    await faqService.create({ question: 'Alpha refunds?', answer: 'Yes within 24h', sort_order: 2 });
    await faqService.create({ question: 'Beta joining?', answer: 'Tap join', sort_order: 1 });
    await faqService.create({
      question: 'Gamma partner?',
      answer: 'Partner info',
      audience: 'PARTNERS',
      partner_topic: 'VENUE',
      is_active: false,
      sort_order: 3,
    });

    // Plain envelope with the default sort (sort_order asc) and clamp defaults.
    const all = await faqService.table();
    expect(all.total).toBe(3);
    expect(all.rows.map((f) => f.question)).toEqual(['Beta joining?', 'Alpha refunds?', 'Gamma partner?']);
    expect(all.page).toBe(1);
    expect(all.page_size).toBe(25);

    // Search spans question and answer.
    const byAnswer = await faqService.table({ search: 'tap join' });
    expect(byAnswer.rows.map((f) => f.question)).toEqual(['Beta joining?']);

    // audience APP also matches legacy rows missing the field (list() parity).
    await FaqModel.collection.insertOne({
      question: 'Legacy?',
      answer: 'Old row',
      is_active: true,
      sort_order: 0,
      created_at: new Date(),
      updated_at: new Date(),
    } as never);
    const app = await faqService.table({ filters: [{ field: 'audience', op: 'eq', value: 'APP' }] });
    expect(app.total).toBe(3);
    expect(app.rows.map((f) => f.question)).toEqual(['Legacy?', 'Beta joining?', 'Alpha refunds?']);
    const partners = await faqService.table({
      filters: [{ field: 'audience', op: 'eq', value: 'PARTNERS' }],
    });
    expect(partners.rows.map((f) => f.question)).toEqual(['Gamma partner?']);

    // Enum + boolean filters narrow.
    const venueTopic = await faqService.table({
      filters: [{ field: 'partner_topic', op: 'eq', value: 'VENUE' }],
    });
    expect(venueTopic.rows.map((f) => f.question)).toEqual(['Gamma partner?']);
    const active = await faqService.table({ filters: [{ field: 'is_active', op: 'is_true' }] });
    expect(active.total).toBe(3);

    // Allowlisted sort + paging keep the total and report the clamped page back.
    const page2 = await faqService.table({ sort_by: 'question', sort_dir: 'desc', page: 2, page_size: 2 });
    expect(page2.rows.map((f) => f.question)).toEqual(['Beta joining?', 'Alpha refunds?']);
    expect(page2.total).toBe(4);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(2);
  });

  it('serves the faqSubmissionsTable page with search, status filter, sort and paging', async () => {
    await FaqSubmissionModel.create({ question: 'How do refunds work?', email: 'refund@x.com' });
    await FaqSubmissionModel.create({
      question: 'Where are venues listed?',
      super_category_slug: 'dining',
      status: 'IGNORED',
    });
    await FaqSubmissionModel.create({ question: 'Third question here', status: 'CONVERTED' });

    // Plain envelope, newest first (created_at desc + _id tiebreaker).
    const all = await faqSubmissionService.table();
    expect(all.total).toBe(3);
    expect(all.rows.map((s) => s.question)).toEqual([
      'Third question here',
      'Where are venues listed?',
      'How do refunds work?',
    ]);
    expect(all.page).toBe(1);
    expect(all.page_size).toBe(25);

    // Search spans question, email and super_category_slug.
    const byEmail = await faqSubmissionService.table({ search: 'refund@x' });
    expect(byEmail.rows.map((s) => s.question)).toEqual(['How do refunds work?']);
    const bySlug = await faqSubmissionService.table({ search: 'dining' });
    expect(bySlug.rows.map((s) => s.question)).toEqual(['Where are venues listed?']);

    // Status enum filter narrows.
    const ignored = await faqSubmissionService.table({
      filters: [{ field: 'status', op: 'eq', value: 'IGNORED' }],
    });
    expect(ignored.rows.map((s) => s.question)).toEqual(['Where are venues listed?']);

    // Allowlisted sort + paging.
    const page2 = await faqSubmissionService.table({
      sort_by: 'question',
      sort_dir: 'asc',
      page: 2,
      page_size: 1,
    });
    expect(page2.rows.map((s) => s.question)).toEqual(['Third question here']);
    expect(page2.total).toBe(3);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(1);
  });

  it('rejects a faq attached to a non-SUPER category', async () => {
    const cat = await CategoryModel.create({ name: 'Sub', slug: 'sub', level: 'SUB' });
    await expect(
      faqService.create({ question: 'Q', answer: 'A', super_category_id: String(cat._id) })
    ).rejects.toThrow(/not a super category/i);
  });

  it('groups public faqs under their super category', async () => {
    const sup = await CategoryModel.create({ name: 'Dining', slug: 'dining', level: 'SUPER', is_active: true });
    await faqService.create({ question: 'Scoped Q', answer: 'A', super_category_id: String(sup._id) });
    await faqService.create({ question: 'Generic Q', answer: 'A' });

    const groups = await faqService.publicGroups();
    const generic = groups.find((g) => g.super_category === null);
    const scoped = groups.find((g) => g.super_category && String(g.super_category._id) === String(sup._id));
    expect(generic?.faqs).toHaveLength(1);
    expect(scoped?.faqs).toHaveLength(1);
  });
});
