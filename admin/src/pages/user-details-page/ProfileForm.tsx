import {
  Alert,
  Button,
  CardContent,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import PhoneExtensionField from '../../components/PhoneExtensionField';
import SaveIcon from '@mui/icons-material/Save';
import MediaPickerField from '../../components/MediaPickerField';
import type { EditForm } from './queries';

interface Props {
  form: EditForm;
  setForm: React.Dispatch<React.SetStateAction<EditForm | null>>;
  busy: boolean;
  dirty: boolean;
  opError: string | null;
  onSave: () => void;
}

export default function ProfileForm({ form, setForm, busy, dirty, opError, onSave }: Props) {
  return (
    <CardContent>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <Typography variant="subtitle1">Profile</Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<SaveIcon />}
          onClick={onSave}
          disabled={busy || !dirty}
        >
          {busy ? 'Saving…' : 'Save Changes'}
        </Button>
      </Stack>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            label="First name"
            value={form.first_name}
            onChange={(e) => setForm({ ...form, first_name: e.target.value })}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Last name"
            value={form.last_name}
            onChange={(e) => setForm({ ...form, last_name: e.target.value })}
            fullWidth
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            fullWidth
          />
        </Grid>
        <Grid item xs={4} sm={3}>
          <PhoneExtensionField
            value={form.phone_extension}
            onChange={(d) => setForm({ ...form, phone_extension: d })}
            fullWidth
          />
        </Grid>
        <Grid item xs={8} sm={9}>
          <TextField
            label="Phone number"
            value={form.phone_number}
            onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="City"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Zone"
            value={form.zone}
            onChange={(e) => setForm({ ...form, zone: e.target.value })}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Assigned city (admin scope)"
            value={form.assigned_city}
            onChange={(e) => setForm({ ...form, assigned_city: e.target.value })}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Assigned zones (comma-separated)"
            value={form.assigned_zones}
            onChange={(e) => setForm({ ...form, assigned_zones: e.target.value })}
            fullWidth
          />
        </Grid>
        <Grid item xs={12}>
          <MediaPickerField
            label="Profile photo URL"
            value={form.profile_photo}
            onChange={(url) => setForm({ ...form, profile_photo: url })}
            folder="/users"
            showPreview={false}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Bio"
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            fullWidth
            multiline
            minRows={3}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Status"
            select
            value={form.status}
            onChange={(e) =>
              setForm({ ...form, status: e.target.value as EditForm['status'] })
            }
            fullWidth
          >
            <MenuItem value="ACTIVE">Active</MenuItem>
            <MenuItem value="INACTIVE">Inactive</MenuItem>
            <MenuItem value="SUSPENDED">Blocked</MenuItem>
          </TextField>
        </Grid>
        {opError && (
          <Grid item xs={12}>
            <Alert severity="error">{opError}</Alert>
          </Grid>
        )}
      </Grid>
    </CardContent>
  );
}
