import { Grid, Stack } from '@mui/material';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import type { Control } from 'react-hook-form';
import SectionCard from '../../../venues/detail/SectionCard';
import MediaUrlField from '../../../venues/editor/fields/MediaUrlField';
import type { HostFormValues } from '../types';

/**
 * The documents behind a host: their identity numbers, their photo and their
 * police verification.
 *
 * Both files are editable text as well as an upload, because a document is often
 * already hosted somewhere — forcing a re-upload to record one makes the honest
 * answer the slow one.
 */
export default function VerificationSection({
  control,
  onPick,
}: Readonly<{
  control: Control<HostFormValues>;
  onPick: (folder?: string) => Promise<string | null>;
}>) {
  const { t } = useTranslation();

  return (
    <SectionCard
      icon={<FactCheckIcon color="primary" />}
      title={t('directory.hostEditor.verification')}
    >
      <Stack spacing={1.5}>
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, md: 6 }}>
            <RhfTextField
              control={control}
              name="aadhar_number"
              label={t('directory.hostEditor.aadhaar')}
              size="small"
              hint={t('directory.hostEditor.aadhaarHint')}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <RhfTextField
              control={control}
              name="pan_number"
              label={t('directory.hostEditor.pan')}
              size="small"
              hint={t('directory.venueEditor.panHint')}
            />
          </Grid>
        </Grid>
        <MediaUrlField
          control={control}
          name="passport_photo_url"
          label={t('directory.hostEditor.passportPhoto')}
          onPick={() => onPick('/hosts')}
          pickLabel={t('directory.venueEditor.upload')}
        />
        <MediaUrlField
          control={control}
          name="police_verification_url"
          label={t('directory.hostEditor.policeVerification')}
          onPick={() => onPick('/host-documents')}
          pickLabel={t('directory.venueEditor.upload')}
        />
      </Stack>
    </SectionCard>
  );
}
