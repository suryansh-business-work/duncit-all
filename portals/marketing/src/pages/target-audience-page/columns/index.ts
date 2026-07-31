import type { DuncitColumn } from '@duncit/table';
import type { AudienceRow } from '../helpers';
import { accountColumns } from './account-columns';
import { activityColumns, identityColumns, placeColumns, reachColumns } from './groups';
import type { AudienceColumnDeps } from './types';

export type { AudienceColumnDeps } from './types';

/**
 * Every column doubles as a filter: the column's `field` IS the server-side
 * filter key, which is why `age`, `push_platform` and `interest_category` are
 * named to match the three the audience service translates rather than
 * comparing directly against a document field.
 */
export function getAudienceColumns(
  deps: Readonly<AudienceColumnDeps>,
): DuncitColumn<AudienceRow>[] {
  return [
    ...identityColumns(),
    ...placeColumns(deps),
    ...reachColumns(deps),
    ...accountColumns(),
    ...activityColumns(deps),
  ];
}
