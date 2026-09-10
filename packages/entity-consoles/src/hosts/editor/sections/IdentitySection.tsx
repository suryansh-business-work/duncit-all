import { Grid, Stack, Typography } from '@mui/material';
import BadgeIcon from '@mui/icons-material/Badge';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import type { Control, UseFormSetValue } from 'react-hook-form';
import SectionCard from '../../../venues/detail/SectionCard';
import AccountPicker from '../../../shared/AccountPicker';
import ChipMultiSelect from '../../../venues/editor/fields/ChipMultiSelect';
import RhfDateField from '../../../venues/editor/fields/RhfDateField';
import type { HostFormValues } from '../types';

/**
 * Who the host is.
 *
 * The ACCOUNT is chosen only while creating — a host record is one-per-login on
 * the server (`user_id` is unique), so pointing an existing record at a
 * different account is not an edit, it is a different record. The contact
 * details stay editable either way: they are the host's onboarding details, and
 * onboarding needs to be able to fix a typo without touching the login.
 */
export default function IdentitySection({
  control,
  setValue,
  isEdit,
}: Readonly<{
  control: Control<HostFormValues>;
  setValue: UseFormSetValue<HostFormValues>;
  isEdit: boolean;
}>) {
  const { t } = useTranslation();

  return (
    <SectionCard icon={<BadgeIcon color="primary" />} title={t('directory.hostEditor.identity')}>
      <Stack spacing={1.5}>
        {isEdit ? (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('directory.hostEditor.accountLocked')}
          </Typography>
        ) : (
          <AccountPicker
            control={control}
            name="user_id"
            label={t('directory.hostEditor.account')}
            hint={t('directory.hostEditor.accountHint')}
            onPicked={(account) => {
              setValue('full_name', account.full_name ?? '', { shouldValidate: true });
              setValue('email', account.email ?? '', { shouldValidate: true });
              setValue('phone', account.phone_number ?? '', { shouldValidate: true });
            }}
          />
        )}

        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, md: 4 }}>
            <RhfTextField
              control={control}
              name="full_name"
              label={t('directory.hostEditor.fullName')}
              size="small"
              required
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <RhfTextField
              control={control}
              name="email"
              label={t('directory.hostEditor.email')}
              size="small"
              required
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <RhfTextField
              control={control}
              name="phone"
              label={t('directory.hostEditor.phone')}
              size="small"
              required
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <RhfDateField
              control={control}
              name="dob"
              label={t('directory.hostEditor.dob')}
              maxDate={new Date()}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 8 }}>
            <RhfTextField
              control={control}
              name="full_address"
              label={t('directory.hostEditor.address')}
              size="small"
              required
            />
          </Grid>
        </Grid>

        <ChipMultiSelect
          control={control}
          name="tags"
          label={t('directory.hostEditor.tags')}
          options={[]}
          freeSolo
          hint={t('directory.venueEditor.tagsHint')}
        />
      </Stack>
    </SectionCard>
  );
}
