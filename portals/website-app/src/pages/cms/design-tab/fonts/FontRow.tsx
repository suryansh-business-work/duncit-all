import { useWatch, type Control } from 'react-hook-form';
import { Chip, MenuItem, Paper, Stack, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitIconButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { fontStack } from '@duncit/brand/cms-design';
import type { DesignFormValues } from '../design-form/design.types';
import { useGooglePreview, useUploadedPreview } from './useFontPreview';
import { useRoleLabels } from './useRoleLabels';

interface Props {
  control: Control<DesignFormValues>;
  index: number;
  onRemove: () => void;
}

/** One chosen typeface: a live specimen, where it comes from, and what it is used for. */
export default function FontRow({ control, index, onRemove }: Readonly<Props>) {
  const { t } = useTranslation();
  const roles = useRoleLabels();
  const font = useWatch({ control, name: `fonts.${index}` });
  const sample = t('websiteApp.cms.fonts.preview');
  const stack = fontStack({ family: font?.family ?? '', fallback: font?.fallback ?? '' });
  useGooglePreview(font?.source === 'GOOGLE' ? (font.family ?? '') : '', sample);
  useUploadedPreview(font?.source === 'CUSTOM' ? (font.family ?? '') : '', font?.files ?? []);

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography variant="h6" component="h3" sx={{ flex: 1, fontFamily: stack }}>
            {font?.family}
          </Typography>
          <Chip size="small" label={font?.source === 'GOOGLE' ? t('websiteApp.cms.fonts.google') : t('websiteApp.cms.fonts.custom')} />
          <DuncitIconButton aria-label={`${t('websiteApp.cms.fonts.remove')}: ${font?.family}`} onClick={onRemove}>
            <DeleteOutlineIcon fontSize="small" />
          </DuncitIconButton>
        </Stack>
        <Typography sx={{ fontFamily: stack, fontSize: (theme) => theme.typography.h5.fontSize }}>
          {sample}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {t('websiteApp.cms.fonts.weights')}: {(font?.weights ?? []).join(', ')}
          {font?.italic ? ` · ${t('websiteApp.cms.fonts.italic')}` : ''}
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <RhfTextField control={control} name={`fonts.${index}.role`} select size="small" label={t('websiteApp.cms.fonts.role')}>
            {roles.map((role) => (
              <MenuItem key={role.value} value={role.value}>
                {role.label}
              </MenuItem>
            ))}
          </RhfTextField>
          <RhfTextField control={control} name={`fonts.${index}.variable`} size="small" label={t('websiteApp.cms.fonts.variable')} hint={t('websiteApp.cms.fonts.variableHint')} />
          <RhfTextField control={control} name={`fonts.${index}.fallback`} size="small" label={t('websiteApp.cms.fonts.fallback')} />
        </Stack>
      </Stack>
    </Paper>
  );
}
