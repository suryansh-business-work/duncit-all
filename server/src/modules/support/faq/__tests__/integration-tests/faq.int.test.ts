import { faqService } from '../../faq.service';
import { FaqModel } from '../../faq.model';
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
