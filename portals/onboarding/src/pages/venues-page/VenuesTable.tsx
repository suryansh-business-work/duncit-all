import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RateReviewIcon from '@mui/icons-material/RateReview';
import { Link as RouterLink } from 'react-router-dom';
import { Chip, IconButton, Link, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from '@mui/material';
import { commissionLabel } from '../../utils/commissionLabel';

interface Props {
  venues: any[];
  onEdit: (venue: any) => void;
  onReview: (venue: any) => void;
}

export default function VenuesTable({ venues, onEdit, onReview }: Readonly<Props>) {
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Venue</TableCell>
          <TableCell>Location</TableCell>
          <TableCell>Owner</TableCell>
          <TableCell>Capacity</TableCell>
          <TableCell>Status</TableCell>
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
            <TableCell><Chip size="small" variant="outlined" label={commissionLabel(venue.venue_commission_pct)} /></TableCell>
            <TableCell>{venue.submitted_at ? new Date(venue.submitted_at).toLocaleDateString() : '—'}</TableCell>
            <TableCell align="right">
              <Tooltip title="Venue details"><IconButton size="small" component={RouterLink} to={`/venues/${venue.id}`}><VisibilityIcon fontSize="small" /></IconButton></Tooltip>
              <Tooltip title="Edit"><IconButton size="small" onClick={() => onEdit(venue)}><EditIcon fontSize="small" /></IconButton></Tooltip>
              <Tooltip title="Review"><IconButton size="small" onClick={() => onReview(venue)}><RateReviewIcon fontSize="small" /></IconButton></Tooltip>
            </TableCell>
          </TableRow>
        ))}
        {venues.length === 0 && (
          <TableRow><TableCell colSpan={8} align="center">No venues found.</TableCell></TableRow>
        )}
      </TableBody>
    </Table>
  );
}