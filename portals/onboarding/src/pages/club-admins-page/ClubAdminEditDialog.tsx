import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { AdminCategorySelect, EMPTY_CATEGORY, type AdminCategoryValue } from '@duncit/category';
import { parseApiError } from '@duncit/utils';
import { UPDATE_CLUB_ADMIN, type ClubAdminRow } from './queries';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  row: ClubAdminRow | null;
  onClose: () => void;
  onSaved: () => void;
}

const str = (value: string | number | null | undefined) => (value == null ? '' : String(value));

/**
 * Edit Club Admin — the same shape as the Host / Venue / Brand edit dialogs.
 *
 * The category uses the ONE shared cascade (`@duncit/category`), the same
 * picker the club form, the pod form and the host form use, rather than a
 * hand-rolled triple of selects.
 */
export default function ClubAdminEditDialog({ row, onClose, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [commission, setCommission] = useState('0');
  const [category, setCategory] = useState<AdminCategoryValue>(EMPTY_CATEGORY);
  const [error, setError] = useState('');
  const [save, { loading }] = useMutation(UPDATE_CLUB_ADMIN);

  useEffect(() => {
    if (!row) return;
    setFullName(str(row.full_name));
    setEmail(str(row.email));
    setPhone(str(row.phone));
    setCommission(String(row.commission_pct ?? 0));
    setCategory({
      ...EMPTY_CATEGORY,
      super_id: str(row.super_category_id),
      category_id: str(row.category_id),
      sub_id: str(row.sub_category_id),
      super_name: str(row.super_category),
      category_name: str(row.category),
      sub_name: str(row.sub_category),
    });
    setError('');
  }, [row]);

  const commissionNumber = Number(commission);
  const commissionValid =
    Number.isFinite(commissionNumber) && commissionNumber >= 0 && commissionNumber <= 100;

  const onSave = async () => {
    if (!row || !commissionValid) return;
    setError('');
    try {
      await save({
        variables: {
          id: row.id,
          input: {
            full_name: fullName.trim(),
            email: email.trim(),
            // Meeting phones arrive with a space after the country code; the
            // server stores what it is given, so trim it here too.
            phone: phone.replace(/\s+/g, ''),
            super_category_id: category.super_id || null,
            category_id: category.category_id || null,
            sub_category_id: category.sub_id || null,
            commission_pct: commissionNumber,
          },
        },
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  if (!row) return null;

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Edit Club Admin
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            display: "block"
          }}>
          {row.club_admin_no || '—'}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            size="small"
            label={t('onboarding.common.fullName')}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            fullWidth
          />
          <TextField
            size="small"
            label={t('shell.common.email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            helperText={t('onboarding.clubAdmins.usedForOnboardingContactTheLogin')}
          />
          <TextField
            size="small"
            label={t('shell.common.phone')}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            fullWidth
          />

          <Stack spacing={0.5}>
            <Typography variant="subtitle2" sx={{
              fontWeight: 700
            }}>
              Category
            </Typography>
            <AdminCategorySelect value={category} onChange={setCategory} direction="column" />
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
              Decides which clubs can be assigned in Review.
            </Typography>
          </Stack>

          <TextField
            size="small"
            type="number"
            label={t('onboarding.clubAdmins.payCommission')}
            value={commission}
            onChange={(e) => setCommission(e.target.value)}
            error={!commissionValid}
            helperText={commissionValid ? '0 inherits the platform default.' : 'Enter 0–100.'}
            sx={{ width: 220 }}
            slotProps={{
              input: { endAdornment: <InputAdornment position="end">%</InputAdornment> }
            }}
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>{t('shell.common.close')}</Button>
        <Button variant="contained" disabled={loading || !commissionValid} onClick={onSave}>
          {loading ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
