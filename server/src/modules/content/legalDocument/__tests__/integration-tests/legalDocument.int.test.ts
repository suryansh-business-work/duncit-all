import { Types } from 'mongoose';
import { legalDocumentService } from '../../legalDocument.service';
import { LegalDocumentModel } from '../../legalDocument.model';

const userId = new Types.ObjectId().toString();

describe('legalDocumentService integration', () => {
  it('creates a document and reads it back', async () => {
    const doc = await legalDocumentService.create(userId, {
      name: 'Vendor NDA',
      document_type: 'NDA',
      content: '<p>Confidential</p>',
    });
    expect(doc.name).toBe('Vendor NDA');
    expect(doc.version_count).toBe(0);
    expect((await legalDocumentService.getById(doc.id))?.name).toBe('Vendor NDA');
  });

  it('snapshots a version on every update', async () => {
    const doc = await legalDocumentService.create(userId, { name: 'Policy', document_type: 'TOS' });
    const v1 = await legalDocumentService.update(userId, doc.id, { content: 'v1' });
    expect(v1.version_count).toBe(1);
    const v2 = await legalDocumentService.update(userId, doc.id, { name: 'Policy v2' });
    expect(v2.version_count).toBe(2);
    expect(v2.name).toBe('Policy v2');
  });

  it('clones a document', async () => {
    const doc = await legalDocumentService.create(userId, { name: 'Master', document_type: 'MSA' });
    const clone = await legalDocumentService.clone(userId, doc.id);
    expect(clone.name).toBe('Copy of Master');
    expect(await LegalDocumentModel.countDocuments()).toBe(2);
  });

  it('lists, filters and computes stats', async () => {
    await legalDocumentService.create(userId, { name: 'A', document_type: 'NDA' });
    await legalDocumentService.create(userId, { name: 'B', document_type: 'TOS' });

    expect(await legalDocumentService.list({ document_type: 'NDA' })).toHaveLength(1);
    expect(await legalDocumentService.list({ search: 'B' })).toHaveLength(1);

    const stats = await legalDocumentService.stats();
    expect(stats.total).toBe(2);
    expect(stats.by_type.length).toBeGreaterThanOrEqual(2);
  });

  it('serves the legalDocumentsTable page with search, filter, sort and paging', async () => {
    await legalDocumentService.create(userId, { name: 'Alpha NDA', document_type: 'NDA' });
    await legalDocumentService.create(userId, { name: 'Beta Terms', document_type: 'TOS' });
    await legalDocumentService.create(userId, { name: 'Gamma NDA', document_type: 'NDA' });

    // Plain envelope with the default sort (updated_at desc) and clamp defaults.
    const all = await legalDocumentService.table();
    expect(all.total).toBe(3);
    expect(all.rows[0].name).toBe('Gamma NDA');
    expect(all.page).toBe(1);
    expect(all.page_size).toBe(25);

    // Search spans name, description and document_type.
    const searched = await legalDocumentService.table({ search: 'beta' });
    expect(searched.rows.map((d) => d.name)).toEqual(['Beta Terms']);
    expect(searched.total).toBe(1);

    // String filter narrows by type.
    const ndas = await legalDocumentService.table({
      filters: [{ field: 'document_type', op: 'eq', value: 'NDA' }],
    });
    expect(ndas.total).toBe(2);

    // Allowlisted sort + paging keep total and report the clamps back.
    const byName = await legalDocumentService.table({ sort_by: 'name', sort_dir: 'asc' });
    expect(byName.rows.map((d) => d.name)).toEqual(['Alpha NDA', 'Beta Terms', 'Gamma NDA']);

    const page2 = await legalDocumentService.table({
      sort_by: 'name',
      sort_dir: 'asc',
      page: 2,
      page_size: 1,
    });
    expect(page2.rows.map((d) => d.name)).toEqual(['Beta Terms']);
    expect(page2.total).toBe(3);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(1);
  });

  it('serves the legalDocumentStatsTable page over the by-type aggregate', async () => {
    await legalDocumentService.create(userId, { name: 'A', document_type: 'NDA' });
    await legalDocumentService.create(userId, { name: 'B', document_type: 'NDA' });
    await legalDocumentService.create(userId, { name: 'C', document_type: 'TOS' });

    // Default sort mirrors the dashboard aggregate: count desc.
    const all = await legalDocumentService.statsTable();
    expect(all.total).toBe(2);
    expect(all.rows.map((r) => r.document_type)).toEqual(['NDA', 'TOS']);

    const searched = await legalDocumentService.statsTable({ search: 'tos' });
    expect(searched.rows).toEqual([{ document_type: 'TOS', count: 1 }]);

    const minTwo = await legalDocumentService.statsTable({
      filters: [{ field: 'count', op: 'gte', value: '2' }],
    });
    expect(minTwo.rows.map((r) => r.document_type)).toEqual(['NDA']);

    const page2 = await legalDocumentService.statsTable({
      sort_by: 'document_type',
      sort_dir: 'asc',
      page: 2,
      page_size: 1,
    });
    expect(page2.rows.map((r) => r.document_type)).toEqual(['TOS']);
    expect(page2.total).toBe(2);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(1);
  });

  it('removes a document and rejects invalid ids', async () => {
    const doc = await legalDocumentService.create(userId, { name: 'Temp', document_type: 'NDA' });
    expect(await legalDocumentService.remove(doc.id)).toBe(true);
    await expect(legalDocumentService.update(userId, 'bad-id', {})).rejects.toThrow(/invalid document id/i);
  });
});
