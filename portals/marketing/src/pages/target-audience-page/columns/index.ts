import type { DuncitColumn } from '@duncit/table';
import type { AudienceRow } from '../helpers';
import { accountColumns } from './account-columns';
import { activityColumns, identityColumns, placeColumns, reachColumns } from './groups';
import type { AudienceColumnDeps } from './types';

export type { AudienceColumnDeps } from './types';

/** Display columns for the audience table. Filtering is the sidebar's job. */
export function getAudienceColumns(
  deps: Readonly<AudienceColumnDeps>,
): DuncitColumn<AudienceRow>[] {
  return [
    ...identityColumns(),
    ...placeColumns(),
    ...reachColumns(),
    ...accountColumns(),
    ...activityColumns(deps),
  ];
}
