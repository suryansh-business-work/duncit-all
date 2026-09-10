import { Divider, Grid, MenuItem, Stack, Typography } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import { BANK_PAYOUT_METHODS, RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import type { Control, UseFormSetValue } from 'react-hook-form';
import SectionCard from '../../detail/SectionCard';
import OwnerPicker from '../fields/OwnerPicker';
import RhfDateField from '../fields/RhfDateField';
import type { VenueFormValues } from '../types';

/**
 * Who runs the venue, and where its payout goes.
 *
 * The owning ACCOUNT can only be chosen while creating: moving a live venue to
 * a different login would move its pods, its slots and its wallet with it, and
 * that is a transfer rather than an edit. The contact details on the record stay
 * editable either way — they are the venue's contact, not the account's.
 */
export default function OwnerSection({
  control,
  setValue,
  isEdit,
}: Readonly<{
  control: Control<VenueFormValues>;
  setValue: UseFormSetValue<VenueFormValues>;
  isEdit: boolean;
}>) {
  const { t } = useTranslation();

  return (
    <SectionCard icon={<PersonIcon color="primary" />} title={t('directory.venueEditor.owner')}>
      <Stack spacing={1.5}>
        {isEdit ? (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('directory.venueEditor.ownerLocked')}
          </Typography>
        ) : (
          <OwnerPicker control={control} setValue={setValue} />
        )}

        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, md: 4 }}>
            <RhfTextField
              control={control}
              name="owner_name"
              label={t('directory.venueEditor.ownerName')}
              size="small"
              required
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <RhfTextField
              control={control}
              name="owner_email"
              label={t('directory.venueEditor.ownerEmail')}
              size="small"
              required
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <RhfTextField
              control={control}
              name="owner_phone"
              label={t('directory.venueEditor.ownerPhone')}
              size="small"
              required
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <RhfDateField
              control={control}
              name="owner_dob"
              label={t('directory.venueEditor.ownerDob')}
              maxDate={new Date()}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 8 }}>
            <RhfTextField
              control={control}
              name="owner_address"
              label={t('directory.venueEditor.ownerAddress')}
              size="small"
            />
          </Grid>
        </Grid>

        <Divider />
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
          {t('directory.venueEditor.payout')}
        </Typography>
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, md: 3 }}>
            <RhfTextField
              control={control}
              name="bank_account.payout_method"
              label={t('directory.venueEditor.payoutMethod')}
              size="small"
              select
            >
              <MenuItem value="">{t('directory.venueEditor.payoutNone')}</MenuItem>
              {BANK_PAYOUT_METHODS.map((method) => (
                <MenuItem key={method} value={method}>
                  {method}
                </MenuItem>
              ))}
            </RhfTextField>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <RhfTextField
              control={control}
              name="bank_account.account_holder_name"
              label={t('directory.venueEditor.accountHolder')}
              size="small"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <RhfTextField
              control={control}
              name="bank_account.account_number"
              label={t('directory.venueEditor.accountNumber')}
              size="small"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <RhfTextField
              control={control}
              name="bank_account.ifsc_code"
              label={t('directory.venueEditor.ifsc')}
              size="small"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <RhfTextField
              control={control}
              name="bank_account.upi_id"
              label={t('directory.venueEditor.upi')}
              size="small"
            />
          </Grid>
        </Grid>
      </Stack>
    </SectionCard>
  );
}
