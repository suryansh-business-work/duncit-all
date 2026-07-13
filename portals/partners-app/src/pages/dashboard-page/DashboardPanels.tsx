import { Alert, Box, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { format } from 'date-fns';
import type { DashboardTab } from './dashboard.types';

interface Props {
  tab: DashboardTab;
  venues: any[];
  pods: any[];
  products: any[];
  hasRoleAccess: boolean;
}

const roleMessages: Record<DashboardTab, string> = {
  venue: 'You must be a Venue Owner to see this dashboard.',
  host: 'You must be a Host to see this dashboard.',
  products: 'You must be an Ecomm Manager to see this dashboard.',
};

export default function DashboardPanels({ tab, venues, pods, products, hasRoleAccess }: Readonly<Props>) {
  const nonVenueRows = tab === 'host' ? pods : products;
  const rows = tab === 'venue' ? venues : nonVenueRows;
  if (!hasRoleAccess && rows.length === 0) return <Alert severity="warning">{roleMessages[tab]}</Alert>;
  if (tab === 'venue') return <VenuePanel venues={venues} />;
  if (tab === 'host') return <HostPanel pods={pods} />;
  return <ProductsPanel products={products} />;
}

interface DataRow {
  id: string;
  cells: Array<React.ReactNode>;
}

function VenuePanel({ venues }: Readonly<{ venues: any[] }>) {
  if (venues.length === 0) return <Alert severity="info">No venue registrations yet.</Alert>;
  return <DataTable headers={['Venue', 'Capacity', 'Status', 'Updated']} rows={venues.map((venue) => ({ id: String(venue.id), cells: [
    <Box key="venue"><Typography fontWeight={900}>{venue.venue_name || 'Untitled venue'}</Typography><Typography variant="caption" color="text.secondary">{[venue.locality, venue.city].filter(Boolean).join(', ') || 'Location pending'}</Typography></Box>,
    Number(venue.capacity || 0),
    <StatusChip key="status" status={venue.status} />,
    formatDate(venue.updated_at || venue.created_at),
  ] }))} />;
}

function HostPanel({ pods }: Readonly<{ pods: any[] }>) {
  if (pods.length === 0) return <Alert severity="info">No hosted pods in this date range.</Alert>;
  return <DataTable headers={['Pod', 'Date', 'Attendees', 'Pod earning']} rows={pods.map((pod) => ({ id: String(pod.id), cells: [
    <Typography key="pod" fontWeight={900}>{pod.pod_title}</Typography>,
    formatDateTime(pod.pod_date_time),
    pod.pod_attendees?.length ?? 0,
    formatMoney(Number(pod.pod_amount || 0) * (pod.pod_attendees?.length ?? 0)),
  ] }))} />;
}

function ProductsPanel({ products }: Readonly<{ products: any[] }>) {
  if (products.length === 0) return <Alert severity="info">No product listings yet.</Alert>;
  return <DataTable headers={['Product', 'Inventory', 'Price', 'Status']} rows={products.map((product) => ({ id: String(product.id), cells: [
    <Typography key="product" fontWeight={900}>{product.product_name}</Typography>,
    `${Number(product.available_count ?? 0)} available`,
    formatMoney(Number(product.unit_cost || 0)),
    <StatusChip key="status" status={product.listing_review_status} />,
  ] }))} />;
}

function DataTable({ headers, rows }: Readonly<{ headers: string[]; rows: DataRow[] }>) {
  return (
    <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 1.25 }}>
      <Table size="small">
        <TableHead><TableRow>{headers.map((header) => <TableCell key={header}>{header}</TableCell>)}</TableRow></TableHead>
        <TableBody>{rows.map((row) => <TableRow key={row.id} hover>{headers.map((header, columnIndex) => <TableCell key={header}>{row.cells[columnIndex]}</TableCell>)}</TableRow>)}</TableBody>
      </Table>
    </TableContainer>
  );
}

function statusChipColor(status: string): 'success' | 'error' | 'info' | 'warning' {
  if (status === 'APPROVED') return 'success';
  if (status === 'REJECTED' || status === 'DENIED') return 'error';
  if (status === 'SUBMITTED') return 'info';
  return 'warning';
}

function StatusChip({ status }: Readonly<{ status: string }>) {
  return <Chip size="small" label={status || 'PENDING'} color={statusChipColor(status)} />;
}

function formatDate(value?: string) {
  return value ? format(new Date(value), 'dd MMM yyyy') : 'Not available';
}

function formatDateTime(value?: string) {
  return value ? format(new Date(value), 'dd MMM yyyy, h:mm a') : 'Not scheduled';
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);
}