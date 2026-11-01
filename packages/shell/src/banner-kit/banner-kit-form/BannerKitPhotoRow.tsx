import { useWatch } from 'react-hook-form';
import { Box, Stack } from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitIconButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { BANNER_KIT_LIMITS } from '@duncit/forms/schemas';
import { useTranslation } from '../../i18n/useTranslation';
import type { BannerKitPhotoRowProps } from './banner-kit.types';

/** The thumbnail's side, on the theme's spacing scale. */
const THUMB = 9;

/** One photo of a kit list: its picture, its caption and the buttons that move or remove it. */
export function BannerKitPhotoRow({ control, name, index, last, onMove, onRemove }: Readonly<BannerKitPhotoRowProps>) {
  const { t } = useTranslation();
  const url = useWatch({ control, name: `${name}.${index}.url` });
  const n = index + 1;

  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }} data-testid={`banner-kit-${name}-row-${index}`}>
      <Box
        component="img"
        src={url}
        alt={t('shell.bannerKit.photoAlt', { vars: { n } })}
        sx={{ width: (theme) => theme.spacing(THUMB), height: (theme) => theme.spacing(THUMB), objectFit: 'cover', borderRadius: 1, flexShrink: 0, bgcolor: 'action.hover' }}
      />
      <RhfTextField
        control={control}
        name={`${name}.${index}.caption`}
        label={t('shell.bannerKit.caption')}
        size="small"
        slotProps={{ htmlInput: { maxLength: BANNER_KIT_LIMITS.caption, 'data-testid': `banner-kit-${name}-caption-${index}` } }}
      />
      <Stack direction="row" sx={{ flexShrink: 0 }}>
        <DuncitIconButton
          size="small"
          aria-label={t('shell.bannerKit.moveUp', { vars: { n } })}
          disabled={index === 0}
          onClick={() => onMove(index, index - 1)}
        >
          <ArrowUpwardIcon fontSize="small" />
        </DuncitIconButton>
        <DuncitIconButton
          size="small"
          aria-label={t('shell.bannerKit.moveDown', { vars: { n } })}
          disabled={last}
          onClick={() => onMove(index, index + 1)}
        >
          <ArrowDownwardIcon fontSize="small" />
        </DuncitIconButton>
        <DuncitIconButton size="small" aria-label={t('shell.bannerKit.removePhoto', { vars: { n } })} onClick={() => onRemove(index)}>
          <DeleteOutlineIcon fontSize="small" />
        </DuncitIconButton>
      </Stack>
    </Stack>
  );
}
