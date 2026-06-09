import {
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
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { CouponRow } from './queries';

interface Props {
  loading: boolean;
  coupons: CouponRow[];
  onEdit: (c: CouponRow) => void;
  onDelete: (c: CouponRow) => void;
}

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: '2-digit' }) : '—';

export default function CouponsTable({ loading, coupons, onEdit, onDelete }: Readonly<Props>) {
  if (loading && coupons.length === 0)
    return (
      <Stack alignItems="center" sx={{ p: 4 }}>
        <CircularProgress />
      </Stack>
    );
  if (coupons.length === 0)
    return (
      <Typography color="text.secondary" sx={{ p: 3 }}>
        No coupons yet.
      </Typography>
    );

  return (
    <Card>
      <CardContent sx={{ p: 0 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Discount</TableCell>
              <TableCell>Scope</TableCell>
              <TableCell>Validity</TableCell>
              <TableCell>Used</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {coupons.map((c) => (
              <TableRow key={c.id} hover>
                <TableCell>
                  <Typography fontWeight={800}>{c.code}</Typography>
                  {c.description && (
                    <Typography variant="caption" color="text.secondary">
                      {c.description}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>{c.discount_pct}%</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={c.scope === 'POD' ? c.pod?.pod_title || 'Pod' : 'Global'}
                    color={c.scope === 'POD' ? 'secondary' : 'default'}
                  />
                </TableCell>
                <TableCell>
                  {fmtDate(c.valid_from)} → {fmtDate(c.valid_until)}
                </TableCell>
                <TableCell>
                  {c.used_count}
                  {c.max_uses ? ` / ${c.max_uses}` : ''}
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    color={c.is_active ? 'success' : 'default'}
                    label={c.is_active ? 'Active' : 'Inactive'}
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => onEdit(c)} aria-label="Edit coupon">
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => onDelete(c)} aria-label="Delete coupon">
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
