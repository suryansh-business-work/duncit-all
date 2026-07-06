import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RateReviewIcon from '@mui/icons-material/RateReview';
import EventNoteIcon from '@mui/icons-material/EventNote';
import { Link as RouterLink } from 'react-router-dom';
import { Button, Chip, IconButton, Link, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from '@mui/material';
import { commissionLabel } from '../../utils/commissionLabel';
import LifecycleActions from '../../components/LifecycleActions';

interface Props {
  venues: any[];
  onEdit: (venue: any) => void;
  onReview: (venue: any) => void;
  canHardDelete: boolean;
  onToggleActive: (venue: any) => void;
  onDelete: (venue: any) => void;
}

export default function VenuesTable({ venues, onEdit, onReview, canHardDelete, onToggleActive, onDelete }: Readonly<Props>) {
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Venue</TableCell>
          <TableCell>Location</TableCell>
          <TableCell>Owner</TableCell>
          <TableCell>Capacity</TableCell>
          <TableCell>Status</TableCell>
          <TableCell>Active</TableCell>
          <TableCell>Pods</TableCell>
          <TableCell>Commission</TableCell>
          <TableCell>Submitted</TableCell>
          <TableCell align="right">Actions</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {venues.map((venue) => (
          <TableRow key={venue.id} hover>
            <TableCell>
              <Link
                component={RouterLink}
                to={`/venues/${venue.id}`}
                underline="hover"
                variant="body2"
                fontWeight={700}
                color="inherit"
              >
                {venue.venue_name}
              </Link>
              <Typography variant="caption" color="text.secondary" display="block">{venue.venue_type}</Typography>
            </TableCell>
            <TableCell>
              <Typography variant="body2">{[venue.locality, venue.city].filter(Boolean).join(', ') || '—'}</Typography>
              <Typography variant="caption" color="text.secondary">{venue.postal_code || '—'}</Typography>
            </TableCell>
            <TableCell>
              <Typography variant="body2">{venue.owner_name || '—'}</Typography>
              <Typography variant="caption" color="text.secondary">{venue.owner_phone || venue.owner_email || '—'}</Typography>
            </TableCell>
            <TableCell>{venue.capacity}</TableCell>
            <TableCell><Chip size="small" label={venue.status} /></TableCell>
            <TableCell>
              <Chip size="small" variant="outlined" color={venue.is_active === false ? 'default' : 'success'} label={venue.is_active === false ? 'Inactive' : 'Active'} />
            </TableCell>
            <TableCell>
              <Tooltip title="View pods hosted at this venue">
                <Button
                  size="small"
                  variant="outlined"
                  color="inherit"
                  startIcon={<EventNoteIcon fontSize="small" />}
                  component={RouterLink}
                  to={`/venues/${venue.id}?tab=pods`}
                >
                  {venue.pod_count ?? 0}
                </Button>
              </Tooltip>
            </TableCell>
            <TableCell><Chip size="small" variant="outlined" label={commissionLabel(venue.venue_commission_pct)} /></TableCell>
            <TableCell>{venue.submitted_at ? new Date(venue.submitted_at).toLocaleDateString() : '—'}</TableCell>
            <TableCell align="right">
              <Tooltip title="Venue details"><IconButton size="small" component={RouterLink} to={`/venues/${venue.id}`}><VisibilityIcon fontSize="small" /></IconButton></Tooltip>
              <Tooltip title="Edit"><IconButton size="small" onClick={() => onEdit(venue)}><EditIcon fontSize="small" /></IconButton></Tooltip>
              <Tooltip title="Review"><IconButton size="small" onClick={() => onReview(venue)}><RateReviewIcon fontSize="small" /></IconButton></Tooltip>
              <LifecycleActions
                active={venue.is_active !== false}
                onToggleActive={() => onToggleActive(venue)}
                canHardDelete={canHardDelete}
                onDelete={() => onDelete(venue)}
              />
            </TableCell>
          </TableRow>
        ))}
        {venues.length === 0 && (
          <TableRow><TableCell colSpan={10} align="center">No venues found.</TableCell></TableRow>
        )}
      </TableBody>
    </Table>
  );
}