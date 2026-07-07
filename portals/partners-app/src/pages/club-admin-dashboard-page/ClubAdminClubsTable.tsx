import { Link as RouterLink } from 'react-router-dom';
import { Alert, Card, Link, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import type { ClubAdminClubRow } from './queries';
import { formatCount, formatMoney, formatRating } from './format';

interface Props {
  clubs: ClubAdminClubRow[];
  currencySymbol: string;
}

export default function ClubAdminClubsTable({ clubs, currencySymbol }: Readonly<Props>) {
  return (
    <Card variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Stack spacing={1.5}>
        <Typography variant="subtitle2" fontWeight={900}>Per-club breakdown</Typography>
        {clubs.length === 0 ? (
          <Alert severity="info">No clubs are assigned to you yet.</Alert>
        ) : (
          <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 1.25 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Club</TableCell>
                  <TableCell align="right">Upcoming</TableCell>
                  <TableCell align="right">Completed</TableCell>
                  <TableCell align="right">Followers</TableCell>
                  <TableCell align="right">Rating</TableCell>
                  <TableCell align="right">Revenue</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {clubs.map((club) => (
                  <TableRow key={club.club_id} hover>
                    <TableCell>
                      <Link component={RouterLink} to={`/club-admin/clubs/${club.club_id}`} underline="hover" fontWeight={800}>
                        {club.club_name}
                      </Link>
                    </TableCell>
                    <TableCell align="right">{formatCount(club.upcoming_pods)}</TableCell>
                    <TableCell align="right">{formatCount(club.completed_pods)}</TableCell>
                    <TableCell align="right">{formatCount(club.followers)}</TableCell>
                    <TableCell align="right">{formatRating(club.rating)}</TableCell>
                    <TableCell align="right">{formatMoney(club.revenue, currencySymbol)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Stack>
    </Card>
  );
}
