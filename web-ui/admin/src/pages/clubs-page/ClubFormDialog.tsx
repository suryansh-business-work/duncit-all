import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import AiFillButton from '../../components/AiFillButton';
import MediaListField from '../../components/MediaListField';
import { ClubForm } from './queries';

interface Props {
  open: boolean;
  form: ClubForm;
  setForm: (f: ClubForm | ((prev: ClubForm) => ClubForm)) => void;
  onClose: () => void;
  onSubmit: () => void;
  busy: boolean;
  opError: string | null;
  superCats: any[];
  subCats: any[];
}

export default function ClubFormDialog({
  open,
  form,
  setForm,
  onClose,
  onSubmit,
  busy,
  opError,
  superCats,
  subCats,
}: Props) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <span>{form.id ? 'Edit Club' : 'New Club'}</span>
        <AiFillButton
          entity="CLUB"
          onFill={(d) =>
            setForm((prev) => ({
              ...prev,
              club_name: d.club_name ?? prev.club_name,
              club_description: d.club_description ?? prev.club_description,
              feature_text: d.feature_text ?? prev.feature_text,
              moments_text: d.moments_text ?? prev.moments_text,
              community_link: d.community_link ?? prev.community_link,
              announcement_link: d.announcement_link ?? prev.announcement_link,
              group_link: d.group_link ?? prev.group_link,
            }))
          }
        />
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Club name"
              value={form.club_name}
              onChange={(e) => setForm({ ...form, club_name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Club ID"
              value={form.club_id}
              onChange={(e) => setForm({ ...form, club_id: e.target.value })}
              disabled={!!form.id}
              helperText={form.id ? 'ID cannot be changed' : 'Auto from name if blank'}
              fullWidth
            />
          </Stack>
          <TextField
            label="Description"
            value={form.club_description}
            onChange={(e) => setForm({ ...form, club_description: e.target.value })}
            fullWidth
            multiline
            minRows={2}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Super Category"
              select
              value={form.super_category_id}
              onChange={(e) => setForm({ ...form, super_category_id: e.target.value })}
              fullWidth
              helperText="e.g. Human / Pet — drives the app feed grouping."
            >
              <MenuItem value="">None</MenuItem>
              {superCats.map((c: any) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Category (sub-category)"
              select
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              fullWidth
            >
              <MenuItem value="">None</MenuItem>
              {subCats.map((c: any) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
            {form.id && (
              <Stack direction="row" alignItems="center" spacing={1}>
                <Switch
                  checked={form.is_active}
                  onChange={(_, v) => setForm({ ...form, is_active: v })}
                />
                <Typography variant="body2">
                  {form.is_active ? 'Active' : 'Inactive'}
                </Typography>
              </Stack>
            )}
          </Stack>
          <MediaListField
            label="Feature images & videos"
            value={form.feature_text}
            onChange={(v) => setForm({ ...form, feature_text: v })}
            folder="/clubs"
            helperText="Cover/header media shown on club page."
          />
          <MediaListField
            label="Club moments"
            value={form.moments_text}
            onChange={(v) => setForm({ ...form, moments_text: v })}
            folder="/clubs/moments"
            helperText="Past event photos."
          />
          <TextField
            label="Meetup venue IDs (one per line)"
            value={form.meetup_venues_text}
            onChange={(e) => setForm({ ...form, meetup_venues_text: e.target.value })}
            fullWidth
            multiline
            minRows={2}
            helperText="Use Location IDs or zone codes."
          />
          <TextField
            label="WhatsApp Community link"
            value={form.community_link}
            onChange={(e) => setForm({ ...form, community_link: e.target.value })}
            fullWidth
          />
          <TextField
            label="WhatsApp Announcement link"
            value={form.announcement_link}
            onChange={(e) => setForm({ ...form, announcement_link: e.target.value })}
            fullWidth
          />
          <TextField
            label="WhatsApp Group link"
            value={form.group_link}
            onChange={(e) => setForm({ ...form, group_link: e.target.value })}
            fullWidth
          />
          {opError && <Alert severity="error">{opError}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={onSubmit}
          disabled={busy || !form.club_name.trim()}
        >
          {busy ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
