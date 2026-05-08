import {
  Alert,
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
import StorefrontIcon from '@mui/icons-material/Storefront';
import AddBusinessIcon from '@mui/icons-material/AddBusiness';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import { STATUS_COLORS } from './helpers';

interface Props {
  loading: boolean;
  items: any[];
  fmtSlot: (s: { start: string; end: string }) => string;
  onManage: (it: any) => void;
  onDelete: (it: any) => void;
}

export default function InterviewsTable({ loading, items, fmtSlot, onManage, onDelete }: Props) {
  return (
    <Card>
      <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
        {loading ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <CircularProgress />
          </Box>
        ) : items.length === 0 ? (
          <Alert severity="info" sx={{ m: 2 }}>
            No interview requests yet.
          </Alert>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Type</TableCell>
                  <TableCell>Applicant</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Preferred Slots</TableCell>
                  <TableCell>Scheduled</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((it: any) => (
                  <TableRow key={it.id} hover>
                    <TableCell>
                      <Chip
                        size="small"
                        icon={it.type === 'HOST' ? <StorefrontIcon /> : <AddBusinessIcon />}
                        label={it.type}
                        color={it.type === 'HOST' ? 'primary' : 'secondary'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {it.applicant_name}
                      </Typography>
                      {it.business_name && (
                        <Typography variant="caption" color="text.secondary">
                          {it.business_name}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" display="block">
                        {it.applicant_email}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {it.applicant_phone}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack
                        direction="row"
                        spacing={0.5}
                        sx={{ flexWrap: 'wrap', gap: 0.5, maxWidth: 280 }}
                      >
                        {it.preferred_slots.slice(0, 3).map((s: any, i: number) => (
                          <Chip key={i} size="small" label={fmtSlot(s)} variant="outlined" />
                        ))}
                        {it.preferred_slots.length > 3 && (
                          <Chip
                            size="small"
                            label={`+${it.preferred_slots.length - 3}`}
                          />
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {it.scheduled_slot ? (
                        <Chip size="small" color="info" label={fmtSlot(it.scheduled_slot)} />
                      ) : (
                        <Typography variant="caption" color="text.disabled">
                          —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip size="small" color={STATUS_COLORS[it.status]} label={it.status} />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Manage">
                        <IconButton size="small" onClick={() => onManage(it)}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => onDelete(it)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
