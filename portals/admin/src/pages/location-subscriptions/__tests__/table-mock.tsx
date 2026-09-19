import { useCallback, useRef, type ComponentProps } from 'react';
import { DuncitTable as GridStub } from '../../../__tests__/table-mock';

/**
 * `@duncit/table` double for the location-subscriptions tests.
 *
 * The grid is the portal-wide stub; this wrapper adds the two things these
 * tables need from it: a search term (so a client-side table's search function
 * runs, set through `tableSearch`), and a fetch that always reaches the LATEST
 * `fetchRows` — the page hands the cities table new rows after every send, and
 * the stub's own refetch otherwise keeps calling the one it mounted with.
 *
 * `useApolloTableFetch` round-trips through the real Apollo client, so the
 * server-paged subscribers table is answered by the suite's MockedProvider.
 */
export { useApolloTableFetch } from '../../localization-page/__tests__/translation-table-mock';

export const tableSearch = { value: '' };

type GridProps = ComponentProps<typeof GridStub>;

export function DuncitTable(props: Readonly<GridProps>) {
  const latest = useRef(props.fetchRows);
  latest.current = props.fetchRows;
  const fetchRows = useCallback<GridProps['fetchRows']>(
    (query) => latest.current({ ...(query as Record<string, unknown>), search: tableSearch.value }),
    [],
  );
  return <GridStub {...props} fetchRows={fetchRows} />;
}
