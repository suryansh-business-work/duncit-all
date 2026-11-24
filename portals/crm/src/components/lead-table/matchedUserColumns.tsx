import { Typography } from '@mui/material';
import type { DuncitColumn } from '@duncit/table';
import type { useTranslation } from '@duncit/shell';
import { PlatformIcons, type PlatformText } from '@duncit/ui';
import type { CrmMatchedUser } from '../../api/crm.types';
import type { CrmLeadEntity, CrmLeadRowBase } from './leadColumns';

type Translate = ReturnType<typeof useTranslation>['t'];

/** The lead kinds whose rows carry `matched_user` (the server matches venue, host and ecomm leads). */
export const MATCHED_USER_ENTITIES: ReadonlySet<CrmLeadEntity> = new Set(['venue', 'host', 'ecomm']);

type MatchedRow = CrmLeadRowBase & { matched_user?: Pick<CrmMatchedUser, 'platforms_used' | 'last_activity_at'> | null };

interface MatchedUserColumnOptions {
  platformText: PlatformText;
  /** Date and time in the admin-configured zone. */
  formatDateTime: (iso: string) => string;
  t: Translate;
}

/**
 * Devices and Last activity of the Duncit account a lead's contact belongs to.
 * Devices filters on the server (`duncit_platforms`: any of the picked
 * platforms); neither sorts, because both are read from the matched account,
 * not stored on the lead.
 */
export function buildMatchedUserColumns<T extends MatchedRow>({
  platformText,
  formatDateTime,
  t,
}: MatchedUserColumnOptions): DuncitColumn<T>[] {
  const notOnDuncit = t('crm.matchedUser.notOnDuncit');
  return [
    {
      field: 'duncit_platforms',
      headerName: t('crm.matchedUser.devices'),
      type: 'enum',
      options: platformText.options,
      sortable: false,
      minWidth: 140,
      cellRenderer: (row) =>
        row.matched_user ? (
          <PlatformIcons platforms={row.matched_user.platforms_used} testId={`crm-lead-platforms-${row.id}`} />
        ) : (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {notOnDuncit}
          </Typography>
        ),
      valueGetter: (row) => (row.matched_user ? platformText.valueText(row.matched_user.platforms_used) : notOnDuncit),
    },
    {
      field: 'matched_last_activity_at',
      headerName: t('crm.matchedUser.lastActivity'),
      type: 'text',
      sortable: false,
      filterable: false,
      minWidth: 170,
      valueGetter: (row) => {
        if (!row.matched_user) return '—';
        const at = row.matched_user.last_activity_at;
        return at ? formatDateTime(at) : t('crm.matchedUser.noActivity');
      },
    },
  ];
}
