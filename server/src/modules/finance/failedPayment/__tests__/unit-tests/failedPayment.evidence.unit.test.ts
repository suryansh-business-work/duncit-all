/**
 * Which evidence files a claim may carry: only the claimant's own private
 * uploads, of a kind that fits the evidence type — and a signed link is only
 * ever made for a file that belongs to the case.
 */
jest.mock('@modules/platform/upload/privateMedia', () => ({
  signedPrivateUrl: jest.fn(async (url: string) => ({ url: `${url}?ik-t=1&ik-s=sig`, expiresAt: new Date('2026-11-22T10:10:00Z') })),
}));

import { SERVER_ENV } from '@observability/log';
import { signedPrivateUrl } from '@modules/platform/upload/privateMedia';
import { caseHasFile, classifyEvidence, evidenceFilesFor, evidenceLink, isOwnEvidence } from '../../failedPayment.evidence';

const USER = '65aa00000000000000000001';
const OTHER = '65aa00000000000000000002';
const ref = (user: string, name: string) => `https://ik.imagekit.io/duncit/${SERVER_ENV}/payment_evidence/${user}/evidence/${name}`;

describe('classifyEvidence', () => {
  it.each([
    ['shot.PNG', 'IMAGE', 'image/png'],
    ['shot.jpeg', 'IMAGE', 'image/jpeg'],
    ['statement.pdf', 'PDF', 'application/pdf'],
    ['notes.docx', 'OTHER', ''],
  ])('%s is %s', (name, kind, mime) => {
    expect(classifyEvidence(ref(USER, name))).toEqual({ kind, mime });
  });
});

describe('isOwnEvidence', () => {
  it('accepts a file in the claimant’s own private folder', () => {
    expect(isOwnEvidence(ref(USER, 'a.png'), USER)).toBe(true);
  });

  it('refuses another account’s file, a public folder, a traversal and a non-URL', () => {
    expect(isOwnEvidence(ref(OTHER, 'a.png'), USER)).toBe(false);
    expect(isOwnEvidence(`https://ik.imagekit.io/duncit/${SERVER_ENV}/support/${USER}/attachments/a.png`, USER)).toBe(false);
    expect(isOwnEvidence(ref(USER, '../../x.png'), USER)).toBe(false);
    expect(isOwnEvidence('not a url', USER)).toBe(false);
    expect(isOwnEvidence(`javascript:${ref(USER, 'a.png')}`, USER)).toBe(false);
  });
});

describe('evidenceFilesFor', () => {
  it('returns the checked files with their kind, without duplicates', () => {
    const files = evidenceFilesFor('BANK_STATEMENT', [ref(USER, 's.pdf'), ref(USER, 's.pdf'), ref(USER, 'p.jpg')], USER);
    expect(files).toEqual([
      { file_ref: ref(USER, 's.pdf'), mime: 'application/pdf', kind: 'PDF' },
      { file_ref: ref(USER, 'p.jpg'), mime: 'image/jpeg', kind: 'IMAGE' },
    ]);
  });

  it('takes no files for a transaction id claim', () => {
    expect(evidenceFilesFor('TRANSACTION_ID', [ref(USER, 'a.png')], USER)).toEqual([]);
  });

  it('refuses a file another account uploaded', () => {
    let error: unknown;
    try {
      evidenceFilesFor('SCREENSHOT', [ref(OTHER, 'a.png')], USER);
    } catch (caught) {
      error = caught;
    }
    expect(error).toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
  });

  it('refuses a PDF as a screenshot and a document as a bank statement', () => {
    expect(() => evidenceFilesFor('SCREENSHOT', [ref(USER, 's.pdf')], USER)).toThrow(/must be an image/);
    expect(() => evidenceFilesFor('BANK_STATEMENT', [ref(USER, 's.docx')], USER)).toThrow(/image or a PDF/);
  });
});

describe('evidence links', () => {
  const kase = { claims: [{ files: [{ file_ref: ref(USER, 'a.png'), mime: 'image/png', kind: 'IMAGE' }] }] } as never;

  it('signs a file that belongs to the case', async () => {
    const link = await evidenceLink(kase, ref(USER, 'a.png'));
    expect(signedPrivateUrl).toHaveBeenCalledWith(ref(USER, 'a.png'), 600);
    expect(link).toEqual({ url: `${ref(USER, 'a.png')}?ik-t=1&ik-s=sig`, expires_at: '2026-11-22T10:10:00.000Z', kind: 'IMAGE' });
  });

  it('never signs a file the case does not hold', async () => {
    expect(caseHasFile(kase, ref(USER, 'b.png'))).toBeNull();
    await expect(evidenceLink(kase, ref(USER, 'b.png'))).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
    expect(signedPrivateUrl).not.toHaveBeenCalled();
  });
});
