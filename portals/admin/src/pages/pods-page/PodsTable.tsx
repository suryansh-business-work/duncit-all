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
  Typography,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PodActionButtons from './PodActionButtons';

interface Props {
  loading: boolean;
  pods: any[];
  clubName: (id: string) => string;
  venueName: (id: string) => string;
  locName: (id: string) => string;
  onEdit: (p: any) => void;
  onQuickEdit: (p: any) => void;
  onDelete: (p: any) => void;
  onComplete: (p: any) => void;
  onView?: (p: any) => void;
}

function PodCover({ pod }: Readonly<{ pod: any }>) {
  const first = pod.pod_images_and_videos?.[0];
  if (!first) {
    return (
      <Avatar variant="rounded" sx={{ width: 40, height: 40 }}>
        {pod.pod_title[0]}
      </Avatar>
    );
  }
  if (first.type === 'VIDEO') {
    return (
      <Box
        component="video"
        src={first.url}
        muted
        playsInline
        preload="metadata"
        sx={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 1, display: 'block' }}
      />
    );
  }
  return (
    <Avatar variant="rounded" src={first.url} sx={{ width: 40, height: 40 }}>
      {pod.pod_title[0]}
    </Avatar>
  );
}

export default function PodsTable({ loading, pods, clubName, venueName, locName, onEdit, onQuickEdit, onDelete, onComplete, onView }: Readonly<Props>) {
  return (
    <Card>
      <CardContent sx={{ p: 0 }}>
        {loading && pods.length === 0 ? (
          <Stack alignItems="center" sx={{ p: 4 }}>
            <CircularProgress />
          </Stack>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Cover</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Club</TableCell>
                <TableCell>Venue</TableCell>
                <TableCell>Date / Time</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Products</TableCell>
                <TableCell>Spots</TableCell>
                <TableCell>Hits</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pods.map((p) => (
                <TableRow
                  key={p.id}
                  hover
                  onClick={() => onView?.(p)}
                  sx={{ cursor: onView ? 'pointer' : 'default' }}
                >
                  <TableCell>
                    <PodCover pod={p} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {p.pod_title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {p.pod_id}
                    </Typography>
                  </TableCell>
                  <TableCell>{clubName(p.club_id)}</TableCell>
                  <TableCell>
                    {p.pod_mode === 'VIRTUAL'
                      ? p.meeting_platform || 'Virtual'
                      : p.venue_id
                        ? venueName(p.venue_id)
                        : locName(p.location_id)}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {p.pod_date_time ? new Date(p.pod_date_time).toLocaleString() : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      <Chip size="small" label={p.pod_mode === 'VIRTUAL' ? 'Virtual' : 'Physical'} />
                      <Chip
                        size="small"
                        label={p.pod_type.replace(/_/g, ' ')}
                        color={p.pod_type.includes('FREE') ? 'default' : 'primary'}
                      />
                    </Stack>
                  </TableCell>
                  <TableCell>{p.pod_amount > 0 ? `₹${p.pod_amount}` : 'Free'}</TableCell>
                  <TableCell>
                    {p.product_requests?.length ? (
                      <Stack spacing={0.25}>
                        {p.product_requests.map((item: any) => (
                          <Typography key={item.product_id} variant="caption">
                            {item.product_name}: {item.quantity}
                          </Typography>
                        ))}
                        <Typography variant="caption" fontWeight={700}>
                          ₹{p.product_cost_total ?? 0}
                        </Typography>
                      </Stack>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    {p.pod_attendees?.length ?? 0}
                    {p.no_of_spots ? ` / ${p.no_of_spots}` : ''}
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <VisibilityIcon fontSize="inherit" color="action" />
                      <Typography variant="caption">{p.pod_hits}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={p.completed_at ? 'Completed' : p.is_active ? 'Active' : 'Draft'}
                      color={p.completed_at ? 'info' : p.is_active ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <PodActionButtons pod={p} onEdit={onEdit} onQuickEdit={onQuickEdit} onDelete={onDelete} onComplete={onComplete} />
                  </TableCell>
                </TableRow>
              ))}
              {pods.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12}>
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        No pods yet.
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
