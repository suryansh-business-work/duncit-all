import type { DocumentNode } from '@apollo/client';

export type SigningStatus = 'UNSIGNED' | 'SIGNED';
export type SignatureMethod = 'DRAW' | 'TYPE' | 'UPLOAD';

/**
 * The only thing the signing dialog needs to know about what it is signing.
 *
 * A legal document calls its title `name` and a contract calls it `title`, so
 * the caller maps rather than the dialog branching: a workflow that knew which
 * entity it was looking at would be two workflows sharing a file.
 */
export interface SignableRecord {
  id: string;
  title: string;
  signing_status: SigningStatus;
}

/**
 * The four operations, supplied by whichever module owns the record.
 *
 * Passed in rather than imported, because Documents and Contracts are separate
 * GraphQL types with separate mutations — this is the seam that lets ONE dialog
 * drive both instead of the second one being a copy of the first (rule 40).
 */
export interface SigningOperations {
  /** Returns the PDF as base64 under `pdfField`. */
  pdfQuery: DocumentNode;
  pdfField: string;
  signMutation: DocumentNode;
  shareMutation: DocumentNode;
  /** Which signing methods this platform allows. */
  methodsQuery: DocumentNode;
  methodsField: string;
}
