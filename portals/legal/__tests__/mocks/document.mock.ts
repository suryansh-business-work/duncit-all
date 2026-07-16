import type { MockedResponse } from '@apollo/client/testing';
import type {
  LegalDocument,
  LegalDocumentStats,
  LegalDocumentTypeCount,
  LegalDocumentVersion,
} from '@duncit/gql-types';
import {
  CLONE_LEGAL_DOCUMENT,
  CREATE_LEGAL_DOCUMENT,
  DELETE_LEGAL_DOCUMENT,
  LEGAL_DOCUMENT,
  LEGAL_DOCUMENT_STATS,
  UPDATE_LEGAL_DOCUMENT,
} from '../../src/graphql/documents';

/**
 * Legal-document mocks. The list/detail queries select field subsets of the
 * generated `LegalDocument` schema type, so each factory is a schema-synced
 * `Pick<…>` projection carrying `__typename` — a renamed/removed server field
 * breaks typecheck, without fabricating fields the query never selects.
 */
const ISO = '2026-01-01T00:00:00.000Z';

/** The row/list projection (LegalDocumentFields fragment). */
export type LegalDocumentRowMock = Pick<
  LegalDocument,
  | 'id'
  | 'name'
  | 'document_type'
  | 'description'
  | 'created_by_name'
  | 'updated_by_name'
  | 'version_count'
  | 'created_at'
  | 'updated_at'
> & { __typename: 'LegalDocument' };

export type LegalDocumentVersionMock = Pick<
  LegalDocumentVersion,
  'id' | 'name' | 'document_type' | 'description' | 'content' | 'updated_by_name' | 'created_at'
> & { __typename: 'LegalDocumentVersion' };

/** The detail projection adds `content` + `versions` to the row fields. */
export type LegalDocumentDetailMock = LegalDocumentRowMock &
  Pick<LegalDocument, 'content'> & { versions: LegalDocumentVersionMock[] };

export type LegalDocumentTypeCountMock = Pick<LegalDocumentTypeCount, 'document_type' | 'count'> & {
  __typename: 'LegalDocumentTypeCount';
};

export type LegalDocumentStatsMock = Pick<LegalDocumentStats, 'total'> & {
  __typename: 'LegalDocumentStats';
  by_type: LegalDocumentTypeCountMock[];
};

export const makeLegalDocumentRow = (
  over: Partial<LegalDocumentRowMock> = {},
): LegalDocumentRowMock => ({
  __typename: 'LegalDocument',
  id: 'd1',
  name: 'Master NDA',
  document_type: 'Privacy Policy',
  description: 'desc',
  created_by_name: 'Sam',
  updated_by_name: 'Sam',
  version_count: 1,
  created_at: ISO,
  updated_at: ISO,
  ...over,
});

export const makeLegalDocumentVersion = (
  over: Partial<LegalDocumentVersionMock> = {},
): LegalDocumentVersionMock => ({
  __typename: 'LegalDocumentVersion',
  id: 'v1',
  name: 'Privacy Policy',
  document_type: 'Privacy Policy',
  description: '',
  content: '<p>old</p>',
  updated_by_name: 'Sam',
  created_at: ISO,
  ...over,
});

export const makeLegalDocumentDetail = (
  over: Partial<LegalDocumentDetailMock> = {},
): LegalDocumentDetailMock => ({
  ...makeLegalDocumentRow(),
  id: 'doc-1',
  name: 'Privacy Policy',
  description: 'Our privacy policy',
  content: '<p>Body text</p>',
  versions: [
    makeLegalDocumentVersion({ id: 'v1', updated_by_name: 'Sam' }),
    makeLegalDocumentVersion({ id: 'v2', content: '<p>older</p>', updated_by_name: '' }),
  ],
  ...over,
});

export const makeLegalDocumentTypeCount = (
  over: Partial<LegalDocumentTypeCountMock> = {},
): LegalDocumentTypeCountMock => ({
  __typename: 'LegalDocumentTypeCount',
  document_type: 'Privacy Policy',
  count: 3,
  ...over,
});

export const makeLegalDocumentStats = (
  over: Partial<LegalDocumentStatsMock> = {},
): LegalDocumentStatsMock => ({
  __typename: 'LegalDocumentStats',
  total: 5,
  by_type: [makeLegalDocumentTypeCount()],
  ...over,
});

/* ---- Query + mutation builders ---- */

export const legalDocumentStatsMock = (
  stats: LegalDocumentStatsMock = makeLegalDocumentStats(),
): MockedResponse => ({
  request: { query: LEGAL_DOCUMENT_STATS },
  result: { data: { legalDocumentStats: stats } },
  maxUsageCount: 20,
});

export const legalDocumentMock = (
  doc: LegalDocumentDetailMock | null = makeLegalDocumentDetail(),
  id = 'doc-1',
): MockedResponse => ({
  request: { query: LEGAL_DOCUMENT, variables: { id } },
  result: { data: { legalDocument: doc } },
});

export const createLegalDocumentMock = (
  over: { id?: string | null } = {},
): MockedResponse => ({
  request: { query: CREATE_LEGAL_DOCUMENT },
  variableMatcher: () => true,
  // Keep an explicit `null` (drives the no-id refetch branch); default otherwise.
  result: {
    data: { createLegalDocument: { __typename: 'LegalDocument', id: over.id === undefined ? 'new-1' : over.id } },
  },
});

export const updateLegalDocumentMock = (id = 'doc-1'): MockedResponse => ({
  request: { query: UPDATE_LEGAL_DOCUMENT },
  variableMatcher: () => true,
  result: {
    data: {
      updateLegalDocument: {
        __typename: 'LegalDocument',
        id,
        version_count: 2,
        updated_at: '2026-02-02T00:00:00.000Z',
      },
    },
  },
});

export const deleteLegalDocumentMock = (id = 'doc-1'): MockedResponse => ({
  request: { query: DELETE_LEGAL_DOCUMENT, variables: { id } },
  result: { data: { deleteLegalDocument: true } },
});

export const cloneLegalDocumentMock = (over: { id?: string } = {}, sourceId = 'doc-1'): MockedResponse => ({
  request: { query: CLONE_LEGAL_DOCUMENT, variables: { id: sourceId } },
  result: { data: { cloneLegalDocument: { __typename: 'LegalDocument', id: over.id ?? 'new-1' } } },
});
