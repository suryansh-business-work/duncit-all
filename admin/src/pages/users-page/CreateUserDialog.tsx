import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  TextField,
  Tooltip,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CasinoIcon from '@mui/icons-material/Casino';
import PhoneExtensionField from '../../components/PhoneExtensionField';
import { type CreateForm, genPassword } from './helpers';

interface Props {
  open: boolean;
  onClose: () => void;
  form: CreateForm;
  setForm: React.Dispatch<React.SetStateAction<CreateForm>>;
  showPwd: boolean;
  setShowPwd: React.Dispatch<React.SetStateAction<boolean>>;
  busy: boolean;
  validForm: boolean;
  opError: string | null;
  onSubmit: () => void;
  roles: any[];
}

export default function CreateUserDialog({
  open,
  onClose,
  form,
  setForm,
  showPwd,
  setShowPwd,
  busy,
  validForm,
  opError,
  onSubmit,
  roles,
}: Props) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Create User</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="First name"
              value={form.first_name}
              onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Last name"
              value={form.last_name}
              onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              helperText="Welcome email is sent if provided."
              fullWidth
            />
          </Grid>
          <Grid item xs={4} sm={3}>
            <PhoneExtensionField
              value={form.phone_extension}
              onChange={(d) => setForm((p) => ({ ...p, phone_extension: d }))}
              fullWidth
            />
          </Grid>
          <Grid item xs={8} sm={9}>
            <TextField
              label="Phone number"
              value={form.phone_number}
              onChange={(e) => setForm((p) => ({ ...p, phone_number: e.target.value }))}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Date of birth"
              type="date"
              value={form.dob}
              onChange={(e) => setForm((p) => ({ ...p, dob: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Temporary password"
              type={showPwd ? 'text' : 'password'}
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              helperText="Minimum 8 characters."
              fullWidth
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="Generate">
                      <IconButton
                        size="small"
                        onClick={() => setForm((p) => ({ ...p, password: genPassword() }))}
                      >
                        <CasinoIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <IconButton size="small" onClick={() => setShowPwd((s) => !s)}>
                      {showPwd ? (
                        <VisibilityOffIcon fontSize="small" />
                      ) : (
                        <VisibilityIcon fontSize="small" />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Roles"
              select
              SelectProps={{ multiple: true }}
              value={form.roles}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  roles:
                    typeof e.target.value === 'string'
                      ? [e.target.value]
                      : (e.target.value as string[]),
                }))
              }
              fullWidth
              required
              helperText="At least one role is required."
            >
              {roles.map((r: any) => (
                <MenuItem key={r.key} value={r.key}>
                  {r.name} ({r.key})
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="City"
              value={form.city}
              onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Zone"
              value={form.zone}
              onChange={(e) => setForm((p) => ({ ...p, zone: e.target.value }))}
              fullWidth
            />
          </Grid>
          {opError && (
            <Grid item xs={12}>
              <Alert severity="error">{opError}</Alert>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={onSubmit} disabled={busy || !validForm}>
          {busy ? 'Creating…' : 'Create User'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
