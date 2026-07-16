import { useEffect, useRef } from 'react';
import { useApolloClient } from '@apollo/client';
import { Alert } from '@mui/material';
import { DuncitTable, useApolloTableFetch } from '@duncit/table';
import type { DashboardRange, DashboardTab } from './dashboard.types';
import {
  DASHBOARD_HOST_PODS_TABLE,
  DASHBOARD_PRODUCTS_TABLE,
  DASHBOARD_VENUES_TABLE,
} from './dashboard.queries';
import {
  DASHBOARD_HOST_POD_COLUMNS,
  DASHBOARD_PRODUCT_COLUMNS,
  DASHBOARD_VENUE_COLUMNS,
  getDashboardRowId,
  type DashboardHostPodRow,
  type DashboardProductRow,
  type DashboardVenueRow,
} from './dashboard-tables';

interface Props {
  tab: DashboardTab;
  range: DashboardRange;
  itemCount: number;
  hasRoleAccess: boolean;
}

const roleMessages: Record<DashboardTab, string> = {
  venue: 'You must be a Venue Owner to see this dashboard.',
  host: 'You must be a Host to see this dashboard.',
  products: 'You must be an Ecomm Manager to see this dashboard.',
};

export default function DashboardPanels({ tab, range, itemCount, hasRoleAccess }: Readonly<Props>) {
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);

  const fetchVenues = useApolloTableFetch<DashboardVenueRow>(client, DASHBOARD_VENUES_TABLE, 'myVenuesTable');

  // The host tab mirrors the legacy myHostPods(from, to) date scope by pinning
  // the page's range onto pod_date_time server-side.
  const fetchHostPods = useApolloTableFetch<DashboardHostPodRow>(
    client,
    DASHBOARD_HOST_PODS_TABLE,
    'myHostPodsTable',
    {
      extraFilters: [
        {
          field: 'pod_date_time',
          op: 'between',
          values: [range.from.toISOString(), range.to.toISOString()],
        },
      ],
    },
    [range],
  );

  const fetchProducts = useApolloTableFetch<DashboardProductRow>(client, DASHBOARD_PRODUCTS_TABLE, 'myProductListingsTable');

  // Tables only refetch on their own query-state changes — reload the visible
  // one when the page-level date range moves (skip the mount fetch).
  const rangeMounted = useRef(false);
  useEffect(() => {
    if (!rangeMounted.current) {
      rangeMounted.current = true;
      return;
    }
    refetchRef.current?.();
  }, [range]);

  if (!hasRoleAccess && itemCount === 0) return <Alert severity="warning">{roleMessages[tab]}</Alert>;
  if (tab === 'venue') {
    return (
      <DuncitTable<DashboardVenueRow>
        tableId="partners-app-dashboard-venues"
        columns={DASHBOARD_VENUE_COLUMNS}
        fetchRows={fetchVenues}
        getRowId={getDashboardRowId}
        emptyText="No venue registrations yet."
        defaultSort={{ field: 'updated_at', dir: 'desc' }}
        searchPlaceholder="Search venue, type, city"
        refetchRef={refetchRef}
      />
    );
  }
  if (tab === 'host') {
    return (
      <DuncitTable<DashboardHostPodRow>
        tableId="partners-app-dashboard-host-pods"
        columns={DASHBOARD_HOST_POD_COLUMNS}
        fetchRows={fetchHostPods}
        getRowId={getDashboardRowId}
        emptyText="No hosted pods in this date range."
        defaultSort={{ field: 'pod_date_time', dir: 'desc' }}
        searchPlaceholder="Search pod title or ID"
        refetchRef={refetchRef}
      />
    );
  }
  return (
    <DuncitTable<DashboardProductRow>
      tableId="partners-app-dashboard-products"
      columns={DASHBOARD_PRODUCT_COLUMNS}
      fetchRows={fetchProducts}
      getRowId={getDashboardRowId}
      emptyText="No product listings yet."
      defaultSort={{ field: 'updated_at', dir: 'desc' }}
      searchPlaceholder="Search product name"
      refetchRef={refetchRef}
    />
  );
}
