import { Types } from 'mongoose';
import { expenseService } from '../../expense.service';

const actor = new Types.ObjectId().toString();

async function seed(over: Record<string, unknown> = {}) {
  return expenseService.create(
    { date: '2026-06-10', category: 'RENT', amount: 1000, description: 'Office rent', payment_method: 'BANK_TRANSFER', ...over },
    actor
  );
}

describe('expenseService integration', () => {
  it('creates, lists and summarizes expenses', async () => {
    await seed({ category: 'RENT', amount: 1000 });
    await seed({ category: 'MARKETING', amount: 500, date: '2026-06-15' });
    await seed({ category: 'RENT', amount: 250, date: '2026-06-20' });

    const all = await expenseService.list();
    expect(all).toHaveLength(3);
    expect(all[0].created_by).toBe(actor);

    const summary = await expenseService.summary();
    expect(summary.total).toBe(1750);
    expect(summary.count).toBe(3);
    const rent = summary.by_category.find((c) => c.category === 'RENT');
    expect(rent?.total).toBe(1250);
  });

  it('filters by date range and category', async () => {
    await seed({ category: 'RENT', amount: 1000, date: '2026-06-01' });
    await seed({ category: 'SALARY', amount: 9000, date: '2026-07-01' });

    const june = await expenseService.list({ from: '2026-06-01', to: '2026-06-30' });
    expect(june).toHaveLength(1);
    const salaries = await expenseService.list({ category: 'SALARY' });
    expect(salaries).toHaveLength(1);
    expect(salaries[0].amount).toBe(9000);
  });

  it('serves the expensesTable page with search, filter, sort and paging', async () => {
    await seed({ vendor_name: 'AWS', category: 'SOFTWARE', amount: 1000, date: '2026-06-10' });
    await seed({ vendor_name: 'Chai stall', category: 'OFFICE', amount: 50, date: '2026-06-15' });
    await seed({ vendor_name: 'Landlord', category: 'RENT', amount: 9000, date: '2026-06-01' });

    // Plain envelope with the old UI's default order (date desc) and clamp defaults.
    const all = await expenseService.table();
    expect(all.total).toBe(3);
    expect(all.rows.map((e) => e.vendor_name)).toEqual(['Chai stall', 'AWS', 'Landlord']);
    expect(all.page).toBe(1);
    expect(all.page_size).toBe(25);

    // Search spans vendor_name / description / reference.
    const byVendor = await expenseService.table({ search: 'aws' });
    expect(byVendor.rows.map((e) => e.vendor_name)).toEqual(['AWS']);
    expect(byVendor.total).toBe(1);

    // Category enum filter narrows (the old UI's category select).
    const rent = await expenseService.table({
      filters: [{ field: 'category', op: 'eq', value: 'RENT' }],
    });
    expect(rent.rows.map((e) => e.vendor_name)).toEqual(['Landlord']);

    // Allowlisted sort + paging keep the total.
    const asc = await expenseService.table({ sort_by: 'amount', sort_dir: 'asc' });
    expect(asc.rows.map((e) => e.amount)).toEqual([50, 1000, 9000]);
    const page2 = await expenseService.table({ sort_by: 'amount', sort_dir: 'asc', page: 2, page_size: 1 });
    expect(page2.rows.map((e) => e.amount)).toEqual([1000]);
    expect(page2.total).toBe(3);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(1);
  });

  it('normalizes unknown category/method and rejects bad amount/date', async () => {
    const e = await seed({ category: 'NONSENSE', payment_method: 'BITCOIN', amount: 42 });
    expect(e.category).toBe('OTHER');
    expect(e.payment_method).toBe('BANK_TRANSFER');

    await expect(seed({ amount: 0 })).rejects.toThrow(/greater than 0/i);
    await expect(seed({ date: 'not-a-date' })).rejects.toThrow(/valid expense date/i);
  });

  it('deletes an expense and errors on a missing id', async () => {
    const e = await seed();
    expect(await expenseService.remove(e.id)).toBe(true);
    expect(await expenseService.list()).toHaveLength(0);
    await expect(expenseService.remove(new Types.ObjectId().toString())).rejects.toThrow(/not found/i);
  });

  it('filters by payment method, search and amount range', async () => {
    await seed({ amount: 1000, vendor_name: 'AWS', payment_method: 'CARD' });
    await seed({ amount: 50, vendor_name: 'Chai stall', payment_method: 'CASH' });

    expect(await expenseService.list({ payment_method: 'CARD' })).toHaveLength(1);
    expect((await expenseService.list({ search: 'aws' }))[0].vendor_name).toBe('AWS');
    expect(await expenseService.list({ min_amount: 100 })).toHaveLength(1);
    expect(await expenseService.list({ max_amount: 100 })).toHaveLength(1);
  });

  it('updates an expense but blocks dropping amount below refunds', async () => {
    const e = await seed({ amount: 1000 });
    const updated = await expenseService.update(e.id, { date: '2026-06-12', category: 'SOFTWARE', amount: 1200 });
    expect(updated.amount).toBe(1200);
    expect(updated.category).toBe('SOFTWARE');

    await expenseService.addRefund(e.id, { date: '2026-06-20', amount: 800 });
    await expect(
      expenseService.update(e.id, { date: '2026-06-12', category: 'SOFTWARE', amount: 500 })
    ).rejects.toThrow(/less than refunds/i);
  });

  it('records refunds as a timeline, nets the expense and blocks over-refund', async () => {
    const e = await seed({ amount: 1000 });
    const r1 = await expenseService.addRefund(e.id, { date: '2026-06-20', amount: 300, note: 'partial' });
    expect(r1.refund_total).toBe(300);
    expect(r1.net_amount).toBe(700);
    expect(r1.refunds).toHaveLength(1);

    await expect(expenseService.addRefund(e.id, { date: '2026-06-21', amount: 9999 })).rejects.toThrow(/exceed/i);
    await expect(expenseService.addRefund(e.id, { date: 'bad', amount: 10 })).rejects.toThrow(/valid refund date/i);

    const summary = await expenseService.summary();
    expect(summary.gross_total).toBe(1000);
    expect(summary.refund_total).toBe(300);
    expect(summary.total).toBe(700);

    const removed = await expenseService.removeRefund(e.id, r1.refunds[0].refund_id);
    expect(removed.refund_total).toBe(0);
    expect(removed.net_amount).toBe(1000);
  });
});
