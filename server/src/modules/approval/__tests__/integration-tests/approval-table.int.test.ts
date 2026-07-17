import { Types } from 'mongoose';
import { approvalService } from '../../approval.service';

const PM = { id: 'pm-1', name: 'pm@example.com' };
const ADMIN = { id: 'admin-1', name: 'admin@example.com' };

const submitProduct = (name: string, requester = PM) =>
  approvalService.submitEcommChange(
    {
      kind: 'PRODUCT',
      target_id: new Types.ObjectId().toString(),
      target_name: name,
      details: [{ label: 'Selling price (₹)', value: '999' }],
      payload: JSON.stringify({ selling_price: 999 }),
    },
    requester,
  );

describe('approvalService.table (approvalRequestsTable) integration', () => {
  it('serves the approval inbox page with search, filters, sort and paging', async () => {
    const widget = await submitProduct('Widget', PM);
    const gadget = await submitProduct('Gadget', ADMIN);
    // Approve one so we can filter by status.
    await approvalService.approve(gadget!.id, ADMIN);

    // Plain envelope: both change requests, default page size.
    const all = await approvalService.table();
    expect(all.total).toBe(2);
    expect(all.rows.map((r) => r!.title).sort()).toEqual([
      'Product change — Gadget',
      'Product change — Widget',
    ]);
    expect(all.page).toBe(1);
    expect(all.page_size).toBe(25);

    // Search spans title, summary and requester name.
    const byTitle = await approvalService.table({ search: 'widget' });
    expect(byTitle.rows.map((r) => r!.title)).toEqual(['Product change — Widget']);
    expect(byTitle.total).toBe(1);
    const byRequester = await approvalService.table({ search: 'pm@example.com' });
    expect(byRequester.rows.map((r) => r!.title)).toEqual(['Product change — Widget']);

    // Status + type filters narrow.
    const pending = await approvalService.table({
      filters: [{ field: 'status', op: 'eq', value: 'PENDING' }],
    });
    expect(pending.rows.map((r) => r!.title)).toEqual(['Product change — Widget']);
    expect(pending.rows.every((r) => r!.status === 'PENDING')).toBe(true);
    const byType = await approvalService.table({
      filters: [{ field: 'type', op: 'eq', value: 'ECOMM_PRODUCT_CHANGE' }],
    });
    expect(byType.total).toBe(2);

    // Allowlisted sort (requester asc: admin@ before pm@) + paging report the clamped page back.
    const asc = await approvalService.table({ sort_by: 'requested_by_name', sort_dir: 'asc', page_size: 1 });
    expect(asc.rows.map((r) => r!.title)).toEqual(['Product change — Gadget']);
    expect(asc.total).toBe(2);
    const page2 = await approvalService.table({
      sort_by: 'requested_by_name',
      sort_dir: 'asc',
      page: 2,
      page_size: 1,
    });
    expect(page2.rows.map((r) => r!.title)).toEqual(['Product change — Widget']);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(1);
  });
});
