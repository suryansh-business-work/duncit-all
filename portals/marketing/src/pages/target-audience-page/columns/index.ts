import type { DuncitColumn } from '@duncit/table';
import type { AudienceRow } from '../helpers';
import { accountColumns } from './account-columns';
import { activityColumns, identityColumns, placeColumns, reachColumns } from './groups';
import type { AudienceColumnDeps } from './types';
import { useTranslation } from '@duncit/app-settings';

export type { AudienceColumnDeps } from './types';

/** Display columns for the audience table. Filtering is the sidebar's job. */
type Translate = ReturnType<typeof useTranslation>['t'];

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
  ];
}
