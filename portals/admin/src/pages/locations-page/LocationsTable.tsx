import {
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

interface Props {
  loading: boolean;
  hasData: boolean;
  locations: any[];
  onEdit: (loc: any) => void;
  onDelete: (loc: any) => void;
}

export default function LocationsTable({ loading, hasData, locations, onEdit, onDelete }: Readonly<Props>) {
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
                <TableCell>Image</TableCell>
                <TableCell>City</TableCell>
                <TableCell>State</TableCell>
                <TableCell>Localities / Areas</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {locations.map((loc: any) => (
                <TableRow key={loc.id} hover>
                  <TableCell>
                    <Avatar
                      variant="rounded"
                      src={loc.location_image}
                      sx={{ width: 48, height: 48 }}
                    >
                      {(loc.city || loc.location_name || '?')[0]}
                    </Avatar>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {loc.city || loc.location_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {loc.country}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {loc.state || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 320 }}>
                    <Stack direction="row" sx={{ gap: 0.5 }} flexWrap="wrap">
                      {loc.location_zones.map((z: any, i: number) => (
                        <Chip
                          key={i}
                          size="small"
                          label={z.pincode ? `${z.zone_name} · ${z.pincode}` : z.zone_name}
                        />
                      ))}
                      {loc.location_zones.length === 0 && (
                        <Typography variant="caption" color="text.secondary">
                          No areas
                        </Typography>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={loc.is_active ? 'Active' : 'Inactive'}
                      color={loc.is_active ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => onEdit(loc)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => onDelete(loc)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {locations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        No locations yet. Click "New Location" to create one.
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
