import { Box, Chip, Typography } from '@mui/material';
import { format } from 'date-fns';
import type { DuncitColumn } from '@duncit/table';

/* Column sets + row shapes for the three "Partner performance" tab tables.
 * Everything here is prop-independent, so it lives at module scope. */

export interface DashboardVenueRow {
  id: string;
  venue_name?: string | null;
  city?: string | null;
  locality?: string | null;
  capacity?: number | null;
  status: string;
  updated_at?: string | null;
  created_at?: string | null;
}

export interface DashboardHostPodRow {
  id: string;
  pod_title: string;
  pod_date_time?: string | null;
  pod_amount?: number | null;
  pod_attendees?: string[] | null;
  is_active: boolean;
  completed_at?: string | null;
}

export interface DashboardProductRow {
  id: string;
  product_name: string;
  available_count?: number | null;
  inventory_count?: number | null;
  unit_cost?: number | null;
  listing_review_status: string;
  updated_at?: string | null;
}

export const getDashboardRowId = (row: { id: string }) => row.id;

function statusChipColor(status: string): 'success' | 'error' | 'info' | 'warning' {
  if (status === 'APPROVED') return 'success';
  if (status === 'REJECTED' || status === 'DENIED') return 'error';
  if (status === 'SUBMITTED') return 'info';
  return 'warning';
}

function StatusChip({ status }: Readonly<{ status: string }>) {
  return <Chip size="small" label={status || 'PENDING'} color={statusChipColor(status)} />;
}

function formatDate(value?: string | null) {
  return value ? format(new Date(value), 'dd MMM yyyy') : 'Not available';
}

function formatDateTime(value?: string | null) {
  return value ? format(new Date(value), 'dd MMM yyyy, h:mm a') : 'Not scheduled';
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);
}

const VENUE_STATUS_OPTIONS = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'].map((value) => ({
  value,
  label: value,
}));

const LISTING_STATUS_OPTIONS = ['PENDING', 'APPROVED', 'DENIED'].map((value) => ({
  value,
  label: value,
}));

const renderVenueCell = (venue: DashboardVenueRow) => (
  <Box sx={{ lineHeight: 1.2 }}>
    <Typography variant="body2" fontWeight={900} component="div">
      {venue.venue_name || 'Untitled venue'}
    </Typography>
    <Typography variant="caption" color="text.secondary" component="div">
      {[venue.locality, venue.city].filter(Boolean).join(', ') || 'Location pending'}
    </Typography>
  </Box>
);

export const DASHBOARD_VENUE_COLUMNS: DuncitColumn<DashboardVenueRow>[] = [
  {
    field: 'venue_name',
    headerName: 'Venue',
    flex: 1,
    minWidth: 220,
    cellRenderer: renderVenueCell,
    valueGetter: (venue) => venue.venue_name ?? 'Untitled venue',
  },
  {
    field: 'capacity',
    headerName: 'Capacity',
    width: 110,
    filter: { type: 'number' },
    valueGetter: (venue) => Number(venue.capacity ?? 0),
  },
  {
    field: 'status',
    headerName: 'Status',
    width: 140,
    filter: { type: 'select', options: VENUE_STATUS_OPTIONS },
    cellRenderer: (venue) => <StatusChip status={venue.status} />,
    valueGetter: (venue) => venue.status,
  },
  {
    field: 'updated_at',
    headerName: 'Updated',
    width: 140,
    valueGetter: (venue) => formatDate(venue.updated_at ?? venue.created_at),
  },
];

export const DASHBOARD_HOST_POD_COLUMNS: DuncitColumn<DashboardHostPodRow>[] = [
  {
    field: 'pod_title',
    headerName: 'Pod',
    flex: 1,
    minWidth: 200,
    valueGetter: (pod) => pod.pod_title,
  },
  {
    field: 'pod_date_time',
    headerName: 'Date',
    minWidth: 175,
    valueGetter: (pod) => formatDateTime(pod.pod_date_time),
  },
  {
    field: 'attendees',
    headerName: 'Attendees',
    sortable: false,
    width: 110,
    valueGetter: (pod) => pod.pod_attendees?.length ?? 0,
  },
  {
    field: 'earning',
    headerName: 'Pod earning',
    sortable: false,
    width: 130,
    valueGetter: (pod) => formatMoney(Number(pod.pod_amount ?? 0) * (pod.pod_attendees?.length ?? 0)),
  },
  {
    field: 'pod_amount',
    headerName: 'Amount',
    hide: true,
    width: 110,
    filter: { type: 'number' },
    valueGetter: (pod) => pod.pod_amount ?? 0,
  },
];

export const DASHBOARD_PRODUCT_COLUMNS: DuncitColumn<DashboardProductRow>[] = [
  {
    field: 'product_name',
    headerName: 'Product',
    flex: 1,
    minWidth: 220,
    valueGetter: (product) => product.product_name,
  },
  {
    field: 'inventory_count',
    headerName: 'Inventory',
    width: 130,
    filter: { type: 'number' },
    valueGetter: (product) => `${Number(product.available_count ?? 0)} available`,
  },
  {
    field: 'unit_cost',
    headerName: 'Price',
    width: 110,
    valueGetter: (product) => formatMoney(Number(product.unit_cost ?? 0)),
  },
  {
    field: 'listing_review_status',
    headerName: 'Status',
    width: 130,
    filter: { type: 'select', options: LISTING_STATUS_OPTIONS },
    cellRenderer: (product) => <StatusChip status={product.listing_review_status} />,
    valueGetter: (product) => product.listing_review_status,
  },
];
