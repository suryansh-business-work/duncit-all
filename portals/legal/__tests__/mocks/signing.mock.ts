import type { MockedResponse } from '@apollo/client/testing';
import type { LegalDocument, SignatureMethod } from '@duncit/gql-types';
import {
  LEGAL_DOCUMENT_PDF,
  LEGAL_SIGNATURE_METHODS,
  SHARE_LEGAL_DOCUMENT,
  SIGN_LEGAL_DOCUMENT,
} from '../../src/graphql/documents';

/**
 * Signing-workflow mocks, for the document flavour of the one shared dialog
 * (`DOCUMENT_SIGNING_OPS`). The contract flavour runs the same code with
 * different documents, so one set of operations is enough to drive it.
 */

/** A few bytes of a real PDF header, base64 — what the server streams back. */
export const PDF_BASE64 = 'JVBERi0xLjcK';

export const signatureMethodsMock = (
  methods: SignatureMethod[] = ['DRAW', 'TYPE', 'UPLOAD'],
): MockedResponse => ({
  request: { query: LEGAL_SIGNATURE_METHODS },
  result: { data: { legalSignatureMethods: methods } },
  maxUsageCount: 10,
});

export const documentPdfMock = (id = 'doc-1', base64 = PDF_BASE64): MockedResponse => ({
  request: { query: LEGAL_DOCUMENT_PDF, variables: { id } },
  result: { data: { legalDocumentPdfBase64: base64 } },
  maxUsageCount: 10,
});

type SignedDocumentMock = Pick<LegalDocument, 'id' | 'signing_status' | 'signed_at' | 'is_locked'> & {
  __typename: 'LegalDocument';
};

/** What the dialog sends as `SignLegalDocumentInput`. */
export interface SignInputMock {
  full_name: string;
  designation: string;
  initials: string;
  signature_image: string;
  signature_method: SignatureMethod;
}

/**
 * A successful signature. `onCall` fires when the mutation actually reaches
 * the link, so a spec can prove a press did — or did not — send one.
 */
export const signDocumentMock = (
  input: SignInputMock,
  id = 'doc-1',
  onCall: () => void = () => undefined,
): MockedResponse => {
  const signed: SignedDocumentMock = {
    __typename: 'LegalDocument',
    id,
    signing_status: 'SIGNED',
    signed_at: '2026-03-04T10:00:00.000Z',
    is_locked: true,
  };
  return {
    request: { query: SIGN_LEGAL_DOCUMENT, variables: { id, input } },
    result: () => {
      onCall();
      return { data: { signLegalDocument: signed } };
    },
  };
};

export const signDocumentErrorMock = (message: string): MockedResponse => ({
  request: { query: SIGN_LEGAL_DOCUMENT, variables: () => true },
  result: { errors: [{ message }] },
});

export const shareDocumentMock = (
  to: string,
  message: string,
  id = 'doc-1',
  onCall: () => void = () => undefined,
): MockedResponse => ({
  request: { query: SHARE_LEGAL_DOCUMENT, variables: { id, to, message } },
  result: () => {
    onCall();
    return { data: { shareLegalDocument: true } };
  },
});

export const shareDocumentErrorMock = (errorMessage: string): MockedResponse => ({
  request: { query: SHARE_LEGAL_DOCUMENT, variables: () => true },
  result: { errors: [{ message: errorMessage }] },
});
