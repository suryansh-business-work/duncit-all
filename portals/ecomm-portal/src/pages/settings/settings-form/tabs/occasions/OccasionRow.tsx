import { useWatch, type Control } from 'react-hook-form';
import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useDateFormat } from '@duncit/app-settings';
import { DuncitIconButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import MoveButtons from '../../../../../components/MoveButtons';
import RhfDateTimeField from '../../../../../components/form/RhfDateTimeField';
import RhfImageField from '../../../../../components/form/RhfImageField';
import RhfNumberField from '../../../../../components/form/RhfNumberField';
import RhfSwitch from '../../../../../components/form/RhfSwitch';
import { TWO_COLUMNS } from '../../../../../lib/layout';
import { isOccasionLive, type OccasionsValues } from './occasion.rules';

interface OccasionRowProps {
  control: Control<OccasionsValues>;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}


/** One festive window: its name and dates, the look it swaps in, and whether it is on. */
export default function OccasionRow({ control, index, isFirst, isLast, onMoveUp, onMoveDown, onRemove }: Readonly<OccasionRowProps>) {
  const { t } = useTranslation();
  const { now } = useDateFormat();
  const label = t('ecommPortal.settings.occasionN', { vars: { n: index + 1 } });
  const row = useWatch({ control, name: `occasions.${index}` });
  const live = row ? isOccasionLive(row, now()) : false;
  const path = `occasions.${index}` as const;
  return (
    <Paper variant="outlined" sx={{ p: 1.5 }} role="group" aria-label={label} data-testid="settings-occasion-row">
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography component="h3" variant="subtitle2">
            {label}
          </Typography>
          {live && <Chip size="small" color="success" label={t('ecommPortal.settings.occasionLive')} data-testid="settings-occasion-live" />}
        </Stack>
        <MoveButtons name={label} canMoveUp={!isFirst} canMoveDown={!isLast} onMoveUp={onMoveUp} onMoveDown={onMoveDown}>
          <DuncitIconButton
            aria-label={t('shell.a11y.removeNamed', { vars: { name: label } })}
            onClick={onRemove}
            data-testid="settings-occasion-remove"
          >
            <CloseIcon fontSize="small" />
          </DuncitIconButton>
        </MoveButtons>
      </Stack>
      <Box sx={TWO_COLUMNS}>
        <RhfTextField control={control} name={`${path}.label`} label={t('ecommPortal.settings.occasionName')} required data-testid="settings-occasion-name" />
        <RhfTextField
          control={control}
          name={`${path}.slug`}
          label={t('ecommPortal.settings.occasionSlug')}
          hint={t('ecommPortal.form.slugHint')}
          data-testid="settings-occasion-slug"
        />
        <RhfDateTimeField control={control} name={`${path}.starts_at`} label={t('ecommPortal.settings.occasionStarts')} required />
        <RhfDateTimeField control={control} name={`${path}.ends_at`} label={t('ecommPortal.settings.occasionEnds')} required />
        <RhfImageField control={control} name={`${path}.logo_url`} label={t('ecommPortal.settings.occasionLogo')} testId="settings-occasion-logo" />
        <RhfImageField control={control} name={`${path}.favicon_url`} label={t('ecommPortal.settings.occasionFavicon')} testId="settings-occasion-favicon" />
        <RhfImageField
          control={control}
          name={`${path}.background_url`}
          label={t('ecommPortal.settings.occasionBackground')}
          testId="settings-occasion-background"
        />
        <RhfTextField
          control={control}
          name={`${path}.background_color`}
          label={t('ecommPortal.settings.occasionColor')}
          hint={t('ecommPortal.settings.occasionColorHint')}
          data-testid="settings-occasion-color"
        />
      </Box>
      <RhfTextField
        control={control}
        name={`${path}.announcement_text`}
        label={t('ecommPortal.settings.occasionBanner')}
        hint={t('ecommPortal.settings.occasionBannerHint')}
        data-testid="settings-occasion-banner"
      />
      <Box sx={TWO_COLUMNS}>
        <RhfSwitch control={control} name={`${path}.is_active`} label={t('ecommPortal.settings.occasionActive')} testId="settings-occasion-active" />
        <RhfNumberField control={control} name={`${path}.sort_order`} label={t('ecommPortal.settings.occasionOrder')} whole testId="settings-occasion-order" />
      </Box>
    </Paper>
  );
}
