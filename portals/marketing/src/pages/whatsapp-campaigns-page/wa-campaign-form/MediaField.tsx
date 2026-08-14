import type { Control, FieldValues, Path } from 'react-hook-form';
import { Stack, Typography } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/app-settings';

interface Props<T extends FieldValues> {
  control: Control<T>;
  /** A document is the only header the recipient reads a file name on. */
  isDocument: boolean;
  /** Whether the URL below arrived from the campaign's own AiSensy setup. */
  fromCampaign: boolean;
}

/**
 * The header image, video or document a media template sends.
 *
 * Every automatic send used to fail here with `Media URL Missing`, and an
 * operator sending by hand hit the same wall with nothing on screen to fill in.
 * The URL is public on purpose: AiSensy fetches the asset itself when it sends,
 * so a link only this browser can open fails once per recipient.
 */
export default function MediaField<T extends FieldValues>({
  control,
  isDocument,
  fromCampaign,
}: Readonly<Props<T>>) {
  const { t } = useTranslation();

  return (
    <Stack spacing={1}>
      <Typography variant="overline" color="text.secondary">
        {t('marketingWhatsapp.mediaTitle')}
      </Typography>
      {fromCampaign && (
        <Typography variant="caption" color="text.secondary">
          {t('marketingWhatsapp.mediaFromCampaign')}
        </Typography>
      )}
      <RhfTextField
        control={control}
        name={'media_url' as Path<T>}
        label={t('marketingWhatsapp.mediaUrlLabel')}
        size="small"
        hint={t('marketingWhatsapp.mediaUrlHelp')}
      />
      {isDocument && (
        <RhfTextField
          control={control}
          name={'media_filename' as Path<T>}
          label={t('marketingWhatsapp.mediaFilenameLabel')}
          size="small"
          hint={t('marketingWhatsapp.mediaFilenameHelp')}
        />
      )}
    </Stack>
  );
}
