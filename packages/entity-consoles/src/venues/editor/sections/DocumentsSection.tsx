import { Grid, Stack } from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import type { Control } from 'react-hook-form';
import SectionCard from '../../detail/SectionCard';
import DocumentsField from '../fields/DocumentsField';
import type { VenueRegistrationConfig } from '../queries';
import type { VenueFormValues } from '../types';

/** The venue's paperwork: uploaded documents, GSTIN and PAN. */
export default function DocumentsSection({
  control,
  config,
  onPick,
}: Readonly<{
  control: Control<VenueFormValues>;
  config: VenueRegistrationConfig;
  onPick: (folder?: string) => Promise<string | null>;
}>) {
  const { t } = useTranslation();

  return (
    <SectionCard
      icon={<DescriptionIcon color="primary" />}
      title={t('directory.venueEditor.documents')}
    >
      <Stack spacing={1.5}>
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, md: 6 }}>
            <RhfTextField
              control={control}
              name="gstin"
              label={t('directory.venueEditor.gstin')}
              size="small"
              hint={t('directory.venueEditor.gstinHint')}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <RhfTextField
              control={control}
              name="pan"
              label={t('directory.venueEditor.pan')}
              size="small"
              hint={t('directory.venueEditor.panHint')}
            />
          </Grid>
        </Grid>
        <DocumentsField
          control={control}
          docTypes={config.doc_types}
          onPick={() => onPick('/venue-documents')}
        />
      </Stack>
    </SectionCard>
  );
}
