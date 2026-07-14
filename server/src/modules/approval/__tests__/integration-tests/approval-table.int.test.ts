import { Types } from 'mongoose';
import { approvalService } from '../../approval.service';

const ADMIN = { id: 'admin-1', name: 'admin@example.com' };

describe('approvalService.table (approvalRequestsTable) integration', () => {
  it('serves the approval inbox page with search, filters, sort and paging', async () => {
    await approvalService.create({
      type: 'ONBOARDING_MEETING_FEEDBACK',
      source_portal: 'onboarding',
      title: 'Host onboarding — Hosty',
      summary: 'Interviewer feedback',
      kind: 'HOST',
      subject_name: 'Hosty Host',
      subject_email: 'hosty@example.com',
    });
    await approvalService.create({
      type: 'ONBOARDING_MEETING_FEEDBACK',
      source_portal: 'onboarding',
      title: 'Venue onboarding — Vera',
      kind: 'VENUE',
      subject_name: 'Venue Vera',
    });
    const product = await approvalService.submitEcommChange(
      {
        kind: 'PRODUCT',
        target_id: new Types.ObjectId().toString(),
        target_name: 'Widget',
        details: [{ label: 'Selling price (₹)', value: '999' }],
        payload: JSON.stringify({ selling_price: 999 }),
      },
      ADMIN
    );
    await approvalService.approve(product!.id, ADMIN);

    // Plain envelope with the default sort (created_at desc → newest first).
    const all = await approvalService.table();
    expect(all.total).toBe(3);
    expect(all.rows.map((r) => r!.title)).toEqual([
      'Product change — Widget',
      'Venue onboarding — Vera',
      'Host onboarding — Hosty',
    ]);
    expect(all.page).toBe(1);
    expect(all.page_size).toBe(25);

    // Search spans title, summary, subject name/email and requester name.
    const bySubject = await approvalService.table({ search: 'vera' });
    expect(bySubject.rows.map((r) => r!.subject_name)).toEqual(['Venue Vera']);
    expect(bySubject.total).toBe(1);
    const byRequester = await approvalService.table({ search: 'admin@example.com' });
    expect(byRequester.rows.map((r) => r!.title)).toEqual(['Product change — Widget']);

    // Status / type / kind filters narrow.
    const pending = await approvalService.table({
      filters: [{ field: 'status', op: 'eq', value: 'PENDING' }],
    });
    expect(pending.total).toBe(2);
    expect(pending.rows.every((r) => r!.status === 'PENDING')).toBe(true);
    const byType = await approvalService.table({
      filters: [{ field: 'type', op: 'eq', value: 'ECOMM_PRODUCT_CHANGE' }],
    });
    expect(byType.rows.map((r) => r!.title)).toEqual(['Product change — Widget']);
    const hosts = await approvalService.table({
      filters: [{ field: 'kind', op: 'eq', value: 'HOST' }],
    });
    expect(hosts.rows.map((r) => r!.subject_name)).toEqual(['Hosty Host']);

    // Allowlisted sort (nulls first on asc, matching mongo ordering).
    const bySubjectName = await approvalService.table({ sort_by: 'subject_name', sort_dir: 'asc' });
    expect(bySubjectName.rows.map((r) => r!.subject_name)).toEqual([
      null,
      'Hosty Host',
      'Venue Vera',
    ]);

    // Paging keeps total and reports the clamped page/page_size back.
    const page2 = await approvalService.table({ page: 2, page_size: 1 });
    expect(page2.rows.map((r) => r!.title)).toEqual(['Venue onboarding — Vera']);
    expect(page2.total).toBe(3);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(1);
  });
});
