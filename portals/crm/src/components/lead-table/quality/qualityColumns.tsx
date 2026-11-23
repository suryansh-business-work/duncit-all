import type { DuncitColumn, DuncitColumnOption } from '@duncit/table';
import type { useTranslation } from '@duncit/shell';
import { ENTITY_OF_TABLE, QUALIFICATION_KEY, VERIFICATION_KEY, keyOr } from '../../lead-quality/qualityLabels';
import type { CrmLeadEntity, CrmLeadRowBase } from '../leadColumns';
import QualityScoreCell from './QualityScoreCell';

type Translate = ReturnType<typeof useTranslation>['t'];

interface QualityColumnOptions {
  entity: CrmLeadEntity;
  /** The row field holding the lead's name, for the quick view's accessible name. */
  nameField: string;
  t: Translate;
}

const textOf = (row: object, key: string): string => {
  const value = (row as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : '';
};

const optionsOf = (labels: Record<string, string>, t: Translate): DuncitColumnOption[] =>
  Object.entries(labels).map(([value, key]) => ({ value, label: t(key) }));

/**
 * The Quality Score column every lead listing shows — sorted and range-filtered
 * on the server's `quality_score`, exported as the number — plus hidden
 * Qualification and Verification columns to filter by.
 */
export function buildQualityColumns<T extends CrmLeadRowBase>({ entity, nameField, t }: QualityColumnOptions): DuncitColumn<T>[] {
  const entityType = ENTITY_OF_TABLE[entity];
  return [
    {
      field: 'quality_score',
      headerName: t('crm.leadQuality.columnHeader'),
      type: 'number',
      minWidth: 250,
      cellRenderer: (row) => (
        <QualityScoreCell entity={entityType} leadId={row.id} leadName={textOf(row, nameField)} quality={row.quality} />
      ),
      valueGetter: (row) => row.quality?.score ?? null,
    },
    {
      field: 'quality_qualification',
      headerName: t('crm.leadQualityTab.qualificationColumn'),
      type: 'enum',
      hide: true,
      // Filter only: the server sorts lead listings by quality_score, not by these.
      sortable: false,
      minWidth: 170,
      options: optionsOf(QUALIFICATION_KEY, t),
      valueGetter: (row) =>
        row.quality ? t(keyOr(QUALIFICATION_KEY, row.quality.qualification, 'crm.leadQuality.pendingVerification')) : '',
    },
    {
      field: 'quality_verification',
      headerName: t('crm.leadQualityTab.verificationColumn'),
      type: 'enum',
      hide: true,
      sortable: false,
      minWidth: 170,
      options: optionsOf(VERIFICATION_KEY, t),
      valueGetter: (row) =>
        row.quality ? t(keyOr(VERIFICATION_KEY, row.quality.verification, 'crm.leadQuality.verificationPending')) : '',
    },
  ];
}
