import { GraphQLError } from 'graphql';
import { privateEvidenceFolder } from '@modules/platform/upload/uploadFolder';
import { signedPrivateUrl } from '@modules/platform/upload/privateMedia';
import type { IEvidenceFile, IFailedPaymentCase } from './failedPaymentCase.model';
import { EVIDENCE_LINK_SECONDS, type EvidenceKind, type EvidenceType } from './failedPayment.types';

/**
 * The buyer's proof files: which references a claim may carry, and opening one.
 *
 * A `file_ref` is the URL the upload hook handed back for folder
 * `payment-evidence`. The server put that file in the uploader's OWN private
 * folder (`/<env>/payment_evidence/<userId>/evidence/…`), so a reference is
 * only accepted when its path sits inside the claimant's folder — a file
 * someone else uploaded can never be attached to your claim.
 */

const IMAGE_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  gif: 'image/gif',
};

const refuse = (message: string): never => {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
};

/** The pathname of a reference, or null when it is not an http(s) URL. */
function pathnameOf(fileRef: string): string | null {
  try {
    const url = new URL(fileRef);
    return url.protocol === 'https:' || url.protocol === 'http:' ? decodeURIComponent(url.pathname) : null;
  } catch {
    return null;
  }
}

/** What a reference is, from its file extension. Pure, for tests. */
export function classifyEvidence(fileRef: string): { kind: EvidenceKind; mime: string } {
  const path = pathnameOf(fileRef) ?? fileRef;
  const ext = (/\.([a-z0-9]{2,5})$/i.exec(path)?.[1] ?? '').toLowerCase();
  if (IMAGE_EXT[ext]) return { kind: 'IMAGE', mime: IMAGE_EXT[ext] };
  if (ext === 'pdf') return { kind: 'PDF', mime: 'application/pdf' };
  return { kind: 'OTHER', mime: '' };
}

/** Whether a reference points into this user's own private evidence folder. Pure, for tests. */
export function isOwnEvidence(fileRef: string, userId: string): boolean {
  const path = pathnameOf(fileRef);
  if (!path || path.includes('..')) return false;
  return path.includes(`${privateEvidenceFolder(userId)}/`);
}

/**
 * The files of one claim, checked: every reference is the claimant's own
 * private upload, and the kinds fit the evidence type — a screenshot is an
 * image, a bank statement an image or a PDF. Duplicates are dropped.
 */
export function evidenceFilesFor(evidenceType: EvidenceType, fileRefs: readonly string[], userId: string): IEvidenceFile[] {
  if (evidenceType === 'TRANSACTION_ID') return [];
  const unique = Array.from(new Set(fileRefs));
  return unique.map((fileRef) => {
    if (!isOwnEvidence(fileRef, userId)) refuse('One of the files was not uploaded from this account. Upload it again.');
    const { kind, mime } = classifyEvidence(fileRef);
    if (evidenceType === 'SCREENSHOT' && kind !== 'IMAGE') refuse('A payment screenshot must be an image.');
    if (evidenceType === 'BANK_STATEMENT' && kind === 'OTHER') refuse('A bank statement must be an image or a PDF.');
    return { file_ref: fileRef, mime, kind };
  });
}

/** Whether a reference belongs to one of the case's claims — the only files a link may be made for. */
export function caseHasFile(kase: Pick<IFailedPaymentCase, 'claims'>, fileRef: string): IEvidenceFile | null {
  for (const claim of kase.claims ?? []) {
    const file = claim.files?.find((f) => f.file_ref === fileRef);
    if (file) return file;
  }
  return null;
}

/** A short-lived signed link to one of the case's files. */
export async function evidenceLink(kase: Pick<IFailedPaymentCase, 'claims'>, fileRef: string) {
  const file = caseHasFile(kase, fileRef);
  if (!file) throw new GraphQLError('Evidence file not found', { extensions: { code: 'NOT_FOUND' } });
  const { url, expiresAt } = await signedPrivateUrl(file.file_ref, EVIDENCE_LINK_SECONDS);
  return { url, expires_at: expiresAt.toISOString(), kind: file.kind };
}
