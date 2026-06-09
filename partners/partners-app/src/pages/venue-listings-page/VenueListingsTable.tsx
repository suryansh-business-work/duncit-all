import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, Typography } from '@mui/material';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import { MY_VENUES } from '../register-venue-page/queries';
import VenueListingsToolbar from './VenueListingsToolbar';

interface Props {
  onEdit: () => void;
}

export default function VenueListingsTable({ onEdit }: Readonly<Props>) {
  const { data, loading, error } = useQuery(MY_VENUES, { fetchPolicy: 'cache-and-network' });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [sort, setSort] = useState('updated_desc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const venues = data?.myVenues ?? [];
  const statusOptions = Array.from(new Set(venues.map((venue: any) => venue.status).filter(Boolean))).sort() as string[];
  const filteredVenues = sortVenues(venues.filter((venue: any) => matchesVenue(venue, search, status)), sort);
  const visibleVenues = filteredVenues.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  useEffect(() => { setPage(0); }, [search, status, sort, venues.length]);

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent sx={{ p: 0 }}>
        <Stack spacing={1.5} sx={{ p: 2, pb: 1 }}>
          <Typography variant="h6" fontWeight={950}>Your venue registrations</Typography>
          <VenueListingsToolbar search={search} status={status} sort={sort} statusOptions={statusOptions} onSearch={setSearch} onStatus={setStatus} onSort={setSort} />
          {error && <Alert severity="error">{error.message}</Alert>}
        </Stack>
        {loading && !data ? <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={24} /></Stack> : venues.length === 0 ? <Alert severity="info" sx={{ m: 2 }}>No venue registration yet.</Alert> : filteredVenues.length === 0 ? <Alert severity="info" sx={{ m: 2 }}>No venue registration matches your filters.</Alert> : (
          <TableContainer>
            <Table size="small">
              <TableHead><TableRow><TableCell>Venue</TableCell><TableCell>Capacity</TableCell><TableCell>Status</TableCell><TableCell>Updated</TableCell><TableCell align="right">Action</TableCell></TableRow></TableHead>
              <TableBody>
                {visibleVenues.map((venue: any) => (
                  <TableRow key={venue.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1.25} alignItems="center">
                        <Box component="img" src={venue.cover_image_url || '/duncit-logo.svg'} alt={venue.venue_name} sx={{ width: 56, height: 56, borderRadius: 1, objectFit: 'cover', bgcolor: 'action.hover' }} />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography fontWeight={900} noWrap>{venue.venue_name || 'Untitled venue'}</Typography>
                          <Typography variant="caption" color="text.secondary" noWrap>{venue.venue_type || 'Venue'} · {venue.city || 'City pending'}</Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>{Number(venue.capacity || 0)}</TableCell>
                    <TableCell><Chip size="small" label={venue.status} color={venue.status === 'APPROVED' ? 'success' : venue.status === 'REJECTED' ? 'error' : venue.status === 'SUBMITTED' ? 'info' : 'warning'} /></TableCell>
                    <TableCell>{formatDate(venue.updated_at || venue.created_at)}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        {venue.status === 'APPROVED' && (
                          <Button
                            size="small"
                            component={RouterLink}
                            to={`/venues/${venue.id}/availability`}
                            startIcon={<EventAvailableIcon />}
                          >
                            Availability
                          </Button>
                        )}
                        <Button size="small" onClick={onEdit}>{venue.status === 'APPROVED' ? 'View' : 'Continue'}</Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination component="div" count={filteredVenues.length} page={page} rowsPerPage={rowsPerPage} rowsPerPageOptions={[5, 10, 25]} onPageChange={(_event, nextPage) => setPage(nextPage)} onRowsPerPageChange={(event) => { setRowsPerPage(Number(event.target.value)); setPage(0); }} />
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
}

function matchesVenue(venue: any, search: string, status: string) {
  const query = search.trim().toLowerCase();
  const haystack = [venue.venue_name, venue.venue_type, venue.city, venue.locality, venue.status].filter(Boolean).join(' ').toLowerCase();
  return (!query || haystack.includes(query)) && (status === 'ALL' || venue.status === status);
}

function sortVenues(venues: any[], sort: string) {
  const next = [...venues];
  if (sort === 'name_asc') return next.sort((a, b) => String(a.venue_name || '').localeCompare(String(b.venue_name || '')));
  if (sort === 'capacity_desc') return next.sort((a, b) => Number(b.capacity || 0) - Number(a.capacity || 0));
  return next.sort((a, b) => Date.parse(b.updated_at || '') - Date.parse(a.updated_at || ''));
}

function formatDate(value?: string) {
  if (!value) return 'Not available';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}