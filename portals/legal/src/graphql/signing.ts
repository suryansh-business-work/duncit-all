import { CONTRACT_PDF, SHARE_CONTRACT, SIGN_CONTRACT } from './contracts';
import {
  LEGAL_DOCUMENT_PDF,
  LEGAL_SIGNATURE_METHODS,
  SHARE_LEGAL_DOCUMENT,
  SIGN_LEGAL_DOCUMENT,
} from './documents';
import type { SigningOperations } from '../components/signing/types';

/**
 * Which operations the signing dialog runs, per module.
 *
 * Contracts and legal documents are separate GraphQL types with separate
 * mutations, so this is the map that lets ONE dialog drive both rather than the
 * second being a copy of the first (rule 40).
 *
 * `legalSignatureMethods` is shared deliberately: which ways of signing this
 * platform allows is a property of the platform, not of what is being signed.
 */
export const DOCUMENT_SIGNING_OPS: SigningOperations = {
  pdfQuery: LEGAL_DOCUMENT_PDF,
  pdfField: 'legalDocumentPdfBase64',
  signMutation: SIGN_LEGAL_DOCUMENT,
  shareMutation: SHARE_LEGAL_DOCUMENT,
  methodsQuery: LEGAL_SIGNATURE_METHODS,
  methodsField: 'legalSignatureMethods',
};

export const CONTRACT_SIGNING_OPS: SigningOperations = {
  pdfQuery: CONTRACT_PDF,
  pdfField: 'contractPdfBase64',
  signMutation: SIGN_CONTRACT,
  shareMutation: SHARE_CONTRACT,
  methodsQuery: LEGAL_SIGNATURE_METHODS,
  methodsField: 'legalSignatureMethods',
};
