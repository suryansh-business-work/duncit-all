import { dateColumn, type DuncitColumn } from '@duncit/table';
import type { Translate } from '@duncit/shell';
import type { LeadCandidate } from '../../api/leadResearch.gql';
import { LEAD_TYPES, QUALIFICATION_KEY } from '../../components/lead-quality/qualityLabels';
import { LEAD_KIND_LABEL_KEY } from '../../lib/leadKinds';
import { CANDIDATE_ORIGIN_KEY, CANDIDATE_STATUS_KEY, labelOf } from '../../lib/leadResearchLabels';
import {
  CandidateStatusChip,
  ContactsCell,
  DuplicateCell,
  NameCell,
  PlaceCell,
  QualificationChip,
  ReviewButton,
  ScoreCell,
} from './candidateCells';

const optionsOf = (t: Translate, map: Record<string, string>) =>
  Object.entries(map).map(([value, key]) => ({ value, label: t(key) }));

/**
 * The review queue's columns. Every sortable and filterable field is one the
 * server's candidate table accepts (crmLeadCandidatesTable); contacts, the
 * duplicate flag and the missing-evidence count are read off the row only.
 */
export function buildCandidateColumns(t: Translate, onOpen: (row: LeadCandidate) => void): DuncitColumn<LeadCandidate>[] {
  return [
    {
      field: 'name',
      headerName: t('shell.common.name'),
      type: 'text',
      flex: 1,
      minWidth: 200,
      cellRenderer: (row) => <NameCell row={row} />,
    },
    {
      field: 'lead_type',
      headerName: t('crm.leadResearch.leadType'),
      type: 'enum',
      options: LEAD_TYPES.map((type) => ({ value: type, label: t(LEAD_KIND_LABEL_KEY[type]) })),
      width: 150,
      valueGetter: (row) => t(LEAD_KIND_LABEL_KEY[row.lead_type]),
    },
    {
      field: 'score',
      headerName: t('crm.leadQuality.columnHeader'),
      type: 'number',
      width: 190,
      cellRenderer: (row) => <ScoreCell row={row} />,
    },
    {
      field: 'qualification',
      headerName: t('crm.leadResearch.qualification'),
      type: 'enum',
      options: optionsOf(t, QUALIFICATION_KEY),
      width: 180,
      cellRenderer: (row) => <QualificationChip value={row.qualification} />,
    },
    {
      field: 'city',
      headerName: t('crm.common.city'),
      type: 'text',
      width: 150,
      cellRenderer: (row) => <PlaceCell row={row} />,
    },
    {
      field: 'contacts',
      headerName: t('crm.common.contacts'),
      type: 'text',
      sortable: false,
      filterable: false,
      minWidth: 200,
      cellRenderer: (row) => <ContactsCell row={row} />,
    },
    {
      field: 'duplicates',
      headerName: t('crm.leadResearch.duplicatesColumn'),
      type: 'text',
      sortable: false,
      filterable: false,
      width: 140,
      cellRenderer: (row) => <DuplicateCell row={row} />,
    },
    {
      field: 'missing_evidence',
      headerName: t('crm.leadResearch.missingEvidence'),
      type: 'number',
      sortable: false,
      filterable: false,
      width: 150,
      valueGetter: (row) => row.missing_evidence.length,
    },
    {
      field: 'origin',
      headerName: t('crm.leadResearch.origin'),
      type: 'enum',
      options: optionsOf(t, CANDIDATE_ORIGIN_KEY),
      width: 140,
      valueGetter: (row) => labelOf(t, CANDIDATE_ORIGIN_KEY, row.origin),
    },
    {
      field: 'status',
      headerName: t('shell.common.status'),
      type: 'enum',
      options: optionsOf(t, CANDIDATE_STATUS_KEY),
      width: 130,
      cellRenderer: (row) => <CandidateStatusChip value={row.status} />,
    },
    dateColumn<LeadCandidate>({ hide: false, headerName: t('shell.common.created'), width: 140 }),
    {
      field: 'actions',
      headerName: t('shell.common.actions'),
      type: 'actions',
      width: 90,
      cellRenderer: (row) => <ReviewButton row={row} onOpen={onOpen} />,
    },
  ];
}
