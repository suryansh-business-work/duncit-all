import { TAB_PARAM } from '@duncit/tabs';
import type { ClubTab } from '../detail/ClubDetailsPage';

/** A club's page, opened on one of its tabs — where a record opened FROM that
 * tab returns to. */
export const clubTabPath = (clubId: string, tab: ClubTab): string =>
  `/clubs/${clubId}?${TAB_PARAM}=${tab}`;
