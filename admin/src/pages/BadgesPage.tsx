import { useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import MediaPickerField from '../components/MediaPickerField';

const BADGES = gql`
  query Badges {
    badges {
      id
      badge_id
      title
      description
      image_url
      condition_type
      threshold
      is_active
      updated_at
    }
  }
`;

const CREATE = gql`
  mutation CreateBadge($input: CreateBadgeInput!) {
    createBadge(input: $input) {
      id
    }
  }
`;
const UPDATE = gql`
  mutation UpdateBadge($id: ID!, $input: UpdateBadgeInput!) {
    updateBadge(badge_doc_id: $id, input: $input) {
      id
    }
  }
`;
const DEL = gql`
  mutation DeleteBadge($id: ID!) {
    deleteBadge(badge_doc_id: $id)
  }
`;

const CONDITIONS = [
  { v: 'POD_JOIN_COUNT', label: 'Pod join count' },
  { v: 'POD_HOST_COUNT', label: 'Pod host count' },
  { v: 'CLUB_JOIN_COUNT', label: 'Club join count' },
  { v: 'POD_REFERRAL_COUNT', label: 'Pod referral count' },
];

interface BadgeForm {
  id?: string;
  title: string;
  description: string;
  image_url: string;
  condition_type: string;
  threshold: number;
  is_active: boolean;
}

const empty: BadgeForm = {
  title: '',
  description: '',
  image_url: '',
  condition_type: 'POD_JOIN_COUNT',
  threshold: 1,
  is_active: true,
};

export default function BadgesPage() {
  const { data, loading, error, refetch } = useQuery(BADGES);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<BadgeForm>(empty);
  const [createBadge, createState] = useMutation(CREATE);
  const [updateBadge, updateState] = useMutation(UPDATE);
  const [deleteBadge] = useMutation(DEL);

  const startCreate = () => {
    setForm(empty);
    setOpen(true);
  };
  const startEdit = (b: any) => {
    setForm({
      id: b.id,
      title: b.title,
      description: b.description,
      image_url: b.image_url,
      condition_type: b.condition_type,
      threshold: b.threshold,
      is_active: b.is_active,
    });
    setOpen(true);
  };

  const save = async () => {
    const { id, ...input } = form;
    if (id) {
      await updateBadge({ variables: { id, input } });
    } else {
      await createBadge({ variables: { input } });
    }
    setOpen(false);
    await refetch();
  };

  const remove = async (b: any) => {
    if (!confirm(`Delete badge "${b.title}"? This also revokes it from all users.`)) return;
    await deleteBadge({ variables: { id: b.id } });
    await refetch();
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight={700}>
          Badges
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={startCreate}>
          New Badge
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error.message}</Alert>}
      {loading && !data && <CircularProgress />}

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)' },
        }}
      >
        {(data?.badges ?? []).map((b: any) => (
          <Card key={b.id} variant="outlined">
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="flex-start">
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 1,
                    bgcolor: 'action.hover',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  {b.image_url ? (
                    <img
                      src={b.image_url}
                      alt={b.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : null}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="subtitle1" fontWeight={700} noWrap>
                      {b.title}
                    </Typography>
                    {!b.is_active && <Chip size="small" label="Inactive" />}
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {b.condition_type} ≥ {b.threshold}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mt: 0.5,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {b.description}
                  </Typography>
                </Box>
                <Stack>
                  <IconButton size="small" onClick={() => startEdit(b)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => remove(b)} color="error">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{form.id ? 'Edit Badge' : 'New Badge'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              multiline
              minRows={2}
              fullWidth
            />
            <MediaPickerField
              label="Badge image"
              value={form.image_url}
              onChange={(url) => setForm({ ...form, image_url: url })}
              folder="/badges"
              helperText="Upload a square PNG/SVG (transparent background recommended)"
            />
            <TextField
              select
              label="Condition"
              value={form.condition_type}
              onChange={(e) => setForm({ ...form, condition_type: e.target.value })}
              fullWidth
            >
              {CONDITIONS.map((c) => (
                <MenuItem key={c.v} value={c.v}>
                  {c.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              type="number"
              label="Threshold"
              value={form.threshold}
              onChange={(e) => setForm({ ...form, threshold: Math.max(1, +e.target.value || 1) })}
              disabled={form.condition_type === 'MANUAL'}
              fullWidth
            />
            <Stack direction="row" spacing={1} alignItems="center">
              <Switch
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              <Typography variant="body2">Active (auto-evaluated)</Typography>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={save}
            variant="contained"
            disabled={!form.title || createState.loading || updateState.loading}
          >
            {form.id ? 'Save' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
