import { useWatch, type Control } from 'react-hook-form';
import { MenuItem, Stack, Tooltip } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitIconButton } from '@duncit/buttons';
import { FALLBACK_ICON_NAMES } from '@duncit/fallback-icons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/app-settings';
import { RhfDateTime, RhfImage, RhfOnOff } from '../../rhf-fields';
import { BUNDLED_SLUGS, type OccasionIconsValues } from './occasion-icons.types';

interface Props {
  control: Control<OccasionIconsValues>;
  index: number;
  onRemove: () => void;
}

/**
 * One festive icon window. The slug names the native app's bundled art when it
 * ships one (used offline, instantly); otherwise the app loads the uploaded
 * icon, and the fallback icon covers a failed load.
 */
export default function OccasionIconRow({ control, index, onRemove }: Readonly<Props>) {
  const { t } = useTranslation();
  const slug = useWatch({ control, name: `icons.${index}.slug` });
  const bundled = BUNDLED_SLUGS.includes(slug.trim().toLowerCase());
  const active = useWatch({ control, name: `icons.${index}.is_active` });

  return (
    <Stack spacing={1.5} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2 }} data-testid={`occasion-icon-${index}`}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <RhfTextField
          control={control}
          name={`icons.${index}.slug`}
          label={t('marketing.occasionIcons.slug')}
          hint={t(bundled ? 'marketing.occasionIcons.slugBundled' : 'marketing.occasionIcons.slugRemote')}
          required
          fullWidth
        />
        <RhfTextField control={control} name={`icons.${index}.label`} label={t('marketing.occasionIcons.label')} fullWidth />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <RhfDateTime control={control} name={`icons.${index}.starts_at`} label={t('marketing.occasionIcons.startsAt')} required />
        <RhfDateTime control={control} name={`icons.${index}.ends_at`} label={t('marketing.occasionIcons.endsAt')} required />
      </Stack>
      <RhfImage
        control={control}
        name={`icons.${index}.icon_url`}
        label={t('marketing.occasionIcons.icon')}
        hint={t('marketing.occasionIcons.iconHint')}
        folder="/branding/occasions"
      />
      <RhfTextField
        control={control}
        name={`icons.${index}.fallback_icon`}
        label={t('marketing.occasionIcons.fallback')}
        hint={t('marketing.occasionIcons.fallbackHint')}
        select
        fullWidth
      >
        {FALLBACK_ICON_NAMES.map((name) => (
          <MenuItem key={name} value={name}>
            {name}
          </MenuItem>
        ))}
      </RhfTextField>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <RhfOnOff
            control={control}
            name={`icons.${index}.is_active`}
            label={t(active ? 'marketing.occasionIcons.on' : 'marketing.occasionIcons.paused')}
          />
          <RhfTextField
            control={control}
            name={`icons.${index}.sort_order`}
            label={t('marketing.occasionIcons.priority')}
            hint={t('marketing.occasionIcons.priorityHint')}
            type="number"
            sx={{ maxWidth: 160 }}
          />
        </Stack>
        <Tooltip title={t('marketing.occasionIcons.remove')}>
          <DuncitIconButton aria-label={t('marketing.occasionIcons.remove')} onClick={onRemove} color="error">
            <DeleteOutlineIcon />
          </DuncitIconButton>
        </Tooltip>
      </Stack>
    </Stack>
  );
}
