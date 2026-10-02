import { Box, Stack, TextField, Tooltip, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { DuncitIconButton } from '@duncit/buttons';
import type { SliderMedia } from '../queries';
import { useTranslation } from '@duncit/shell';

interface Props {
  item: SliderMedia;
  index: number;
  total: number;
  move: (index: number, delta: number) => void;
  remove: (url: string) => void;
  update: (index: number, patch: Partial<SliderMedia>) => void;
}

/** One slide: preview, reorder/remove buttons and its overlay copy fields. */
export default function SliderMediaItem({ item, index, total, move, remove, update }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack
      spacing={1}
      sx={{ p: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}
    >
      <Stack direction="row" spacing={1} sx={{
        alignItems: "center"
      }}>
      {item.type === 'VIDEO' ? (
        <Box
          component="video"
          src={item.url}
          muted
          sx={{
            width: 72,
            height: 48,
            objectFit: 'cover',
            borderRadius: 1,
            bgcolor: 'black',
          }}
        />
      ) : (
        <Box
          component="img"
          src={item.url}
          alt="slide"
          sx={{
            width: 72,
            height: 48,
            objectFit: 'cover',
            borderRadius: 1,
          }}
        />
      )}
      <Typography variant="caption" sx={{ flex: 1, minWidth: 0, wordBreak: 'break-all' }}>
        {item.type} · {item.url}
      </Typography>
      <Tooltip title={t('products.settings.moveUp')}>
        <span>
          <DuncitIconButton
            size="small"
            aria-label={t('products.settings.moveUp')}
            disabled={index === 0}
            onClick={() => move(index, -1)}
          >
            <ArrowUpwardIcon fontSize="inherit" />
          </DuncitIconButton>
        </span>
      </Tooltip>
      <Tooltip title={t('products.settings.moveDown')}>
        <span>
          <DuncitIconButton
            size="small"
            aria-label={t('products.settings.moveDown')}
            disabled={index === total - 1}
            onClick={() => move(index, 1)}
          >
            <ArrowDownwardIcon fontSize="inherit" />
          </DuncitIconButton>
        </span>
      </Tooltip>
      <Tooltip title={t('products.settings.remove')}>
        <DuncitIconButton size="small" aria-label={t('products.settings.remove')} onClick={() => remove(item.url)}>
          <DeleteOutlineIcon fontSize="inherit" />
        </DuncitIconButton>
      </Tooltip>
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <TextField
          size="small"
          label={t('products.settings.heading')}
          value={item.heading ?? ''}
          onChange={(e) => update(index, { heading: e.target.value })}
          fullWidth
          placeholder={t('products.settings.headingPlaceholder')}
        />
        <TextField
          size="small"
          label={t('products.settings.subheading')}
          value={item.subheading ?? ''}
          onChange={(e) => update(index, { subheading: e.target.value })}
          fullWidth
          placeholder={t('products.settings.subheadingPlaceholder')}
        />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <TextField
          size="small"
          label={t('products.settings.ctaLabel')}
          value={item.cta_label ?? ''}
          onChange={(e) => update(index, { cta_label: e.target.value })}
          fullWidth
          placeholder={t('products.settings.ctaPlaceholder')}
        />
        <TextField
          size="small"
          label={t('products.settings.ctaLink')}
          value={item.cta_url ?? ''}
          onChange={(e) => update(index, { cta_url: e.target.value })}
          fullWidth
          placeholder="/shop"
        />
      </Stack>
    </Stack>
  );
}
