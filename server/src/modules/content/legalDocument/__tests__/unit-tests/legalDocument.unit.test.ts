import { Types } from 'mongoose';
import { legalDocumentService } from '../../legalDocument.service';
import { legalDocumentResolvers } from '../../legalDocument.resolver';
import { makeContext } from '@test/harness';

const uid = new Types.ObjectId().toString();

describe('legalDocument unit', () => {
  it('create requires a name', async () => {
    await expect(
      legalDocumentService.create(uid, { name: '  ', document_type: 'NDA' })
    ).rejects.toThrow(/name is required/i);
  });

  it('create requires a document type', async () => {
    await expect(
      legalDocumentService.create(uid, { name: 'NDA', document_type: '' })
    ).rejects.toThrow(/type is required/i);
  });

  it('legalDocuments query is gated to legal roles', () => {
    expect(() =>
      (legalDocumentResolvers.Query as any).legalDocuments({}, {}, makeContext({ roles: ['USER'] }))
    ).toThrow(/access denied/i);
  });
});
