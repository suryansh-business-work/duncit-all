import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { actionsColumn, type DuncitColumn } from '@duncit/table';
import type { AudienceRow } from '../helpers';
import { accountColumns } from './account-columns';
import { activityColumns, identityColumns, placeColumns, reachColumns } from './groups';
import type { AudienceColumnDeps } from './types';
import { useTranslation } from '@duncit/app-settings';

export type { AudienceColumnDeps } from './types';

/** Display columns for the audience table. Filtering is the sidebar's job. */
type Translate = ReturnType<typeof useTranslation>['t'];

/** The Actions column, only when the table is showing a list somebody can be
 * removed from — an audience directory has no list to remove them from. */
const removeColumn = (
  onRemove: (row: AudienceRow) => void,
  t: Translate,
): DuncitColumn<AudienceRow> =>
  actionsColumn<AudienceRow>({
    width: 90,
    onDelete: onRemove,
    delete: {
      title: t('marketing.targetAudience.removeFromThisList'),
      icon: <DeleteOutlineIcon fontSize="small" />,
    },
  });

export function getAudienceColumns(
  deps: Readonly<AudienceColumnDeps>,
  t: Translate,
): DuncitColumn<AudienceRow>[] {
  return [
    ...identityColumns(t),
    ...placeColumns(t),
    ...reachColumns(t),
    ...accountColumns(t),
    ...activityColumns(deps, t),
    ...(deps.onRemove ? [removeColumn(deps.onRemove, t)] : []),
  ];
}
