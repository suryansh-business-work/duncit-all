import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardContent,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import LockResetIcon from '@mui/icons-material/LockReset';
import ChangePasswordDialog from './ChangePasswordDialog';
import DeletionRequestPanel from './DeletionRequestPanel';
import { useTranslation } from '../../i18n/useTranslation';

/** Account security: change password, plus the de-emphasised deletion corner
 * at the bottom of Profile → Settings. */
export default function SecuritySection() {
  const { t } = useTranslation();
  const [changeOpen, setChangeOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            alignItems={{ sm: 'center' }}
            justifyContent="space-between"
          >
            <Stack sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Password
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Change your password with an email verification code.
              </Typography>
            </Stack>
            <Button
              variant="outlined"
              startIcon={<LockResetIcon />}
              onClick={() => setChangeOpen(true)}
              data-testid="open-change-password"
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '16px' }}
            >
              Change password
            </Button>
          </Stack>

          <DeletionRequestPanel onToast={setToast} />
        </Stack>
      </CardContent>

      <ChangePasswordDialog
        open={changeOpen}
        onClose={() => setChangeOpen(false)}
        onChanged={() => setToast(t('mweb.account.passwordUpdated'))}
      />

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" onClose={() => setToast(null)}>
          {toast}
        </Alert>
      </Snackbar>
    </Card>
  );
}
