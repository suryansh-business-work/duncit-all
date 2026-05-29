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

  it('removes a document and rejects invalid ids', async () => {
    const doc = await legalDocumentService.create(userId, { name: 'Temp', document_type: 'NDA' });
    expect(await legalDocumentService.remove(doc.id)).toBe(true);
    await expect(legalDocumentService.update(userId, 'bad-id', {})).rejects.toThrow(/invalid document id/i);
  });
});
