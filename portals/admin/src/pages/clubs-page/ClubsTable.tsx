import {
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import EventIcon from '@mui/icons-material/Event';

interface Props {
  loading: boolean;
  hasData: boolean;
  clubs: any[];
  catName: (id: string) => string;
  onCreate: () => void;
  onEdit: (c: any) => void;
  onRemove: (c: any) => void;
  onView?: (c: any) => void;
}

export default function ClubsTable({
  loading,
  hasData,
  clubs,
  catName,
  onCreate,
  onEdit,
  onRemove,
  onView,
}: Readonly<Props>) {
  return (
    <Card>
      <CardContent sx={{ p: 0 }}>
        {loading && !hasData ? (
          <Stack alignItems="center" sx={{ p: 4 }}>
            <CircularProgress />
          </Stack>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Cover</TableCell>
                <TableCell>Club</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Venues</TableCell>
                <TableCell>WhatsApp</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {clubs.map((c: any) => (
                <TableRow
                  key={c.id}
                  hover
                  onClick={() => onView?.(c)}
                  sx={{ cursor: onView ? 'pointer' : 'default' }}
                >
                  <TableCell>
                    <Avatar
                      variant="rounded"
                      src={c.club_feature_images_and_videos?.[0]?.url}
                      sx={{ width: 48, height: 48 }}
                    >
                      {c.club_name[0]}
                    </Avatar>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {c.club_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {c.club_id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {c.category_id ? (
                      <Chip size="small" label={catName(c.category_id)} />
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{c.matched_venues_count ?? 0}</Typography>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      {c.club_whats_app_community_link && <Chip size="small" label="C" />}
                      {c.club_whats_app_group_link && <Chip size="small" label="G" />}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={c.is_active ? 'Active' : 'Draft'}
                      color={c.is_active ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <Tooltip title="View Pods">
                      <IconButton
                        size="small"
                        component={RouterLink}
                        to={`/pods?club_id=${c.id}`}
                      >
                        <EventIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => onEdit(c)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => onRemove(c)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {clubs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        No clubs yet.{' '}
                        <Link component="button" onClick={onCreate}>
                          Create the first one
                        </Link>
                        .
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
