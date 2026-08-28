import { useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ImageIcon from '@mui/icons-material/Image';
import { DuncitButton } from '@duncit/buttons';
import { AiMonitoringChip } from '@duncit/ai-monitoring/mui';
import { useTranslation } from '../i18n/useTranslation';
import MediaPickerDialog from '../MediaPickerDialog';
import MediaListRow from './MediaListRow';

interface Props {
  label: string;
  /** Newline-separated URLs (matches existing `feature_text` / `media_text` fields). */
  value: string;
  onChange: (next: string) => void;
  folder?: string;
  helperText?: string;
  /** Defaults to the shared `Add image` copy in the reader's language. */
  buttonLabel?: string;
  /** Offer the device alone — no stock library. See MediaPickerDialog. */
  deviceOnly?: boolean;
}

export default function MediaListField({
  label,
  value,
  onChange,
  folder,
  helperText,
  buttonLabel,
  deviceOnly = false,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const addLabel = buttonLabel ?? t('media.list.addImage');
  const items = value
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  const [pickerOpen, setPickerOpen] = useState<number | 'new' | null>(null);

  const setAt = (i: number, url: string) => {
    const copy = [...items];
    copy[i] = url;
    onChange(copy.join('\n'));
  };
  const remove = (i: number) => {
    const copy = items.filter((_, idx) => idx !== i);
    onChange(copy.join('\n'));
  };
  // No bounds check: a row's own arrows are disabled at the two ends (see
  // MediaListRow), so there is one place that decides what is movable rather
  // than two that could disagree.
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    const copy = [...items];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    onChange(copy.join('\n'));
  };
  const append = (url: string) => onChange([...items, url].join('\n'));

  return (
    <Box>
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          mb: 1
        }}>
        <Typography variant="subtitle2">{label}</Typography>
        <Stack direction="row" spacing={1} sx={{
          alignItems: "center"
        }}>
          <AiMonitoringChip />
          <DuncitButton size="small" startIcon={<AddIcon />} onClick={() => setPickerOpen('new')}>
            {addLabel}
          </DuncitButton>
        </Stack>
      </Stack>
      {helperText && (
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            display: 'block',
            mb: 1
          }}>
          {helperText}
        </Typography>
      )}
      {items.length === 0 ? (
        <Box
          sx={{
            border: 1,
            borderStyle: 'dashed',
            borderColor: 'divider',
            borderRadius: 1,
            p: 3,
            textAlign: 'center',
            color: 'text.secondary',
          }}
        >
          <ImageIcon sx={{ opacity: 0.5 }} />
          <Typography variant="caption" sx={{ display: 'block' }}>
            {t('media.list.empty', { vars: { action: addLabel } })}
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1}>
          {items.map((url, i) => (
            <MediaListRow
              key={`${url}-${i}`}
              url={url}
              index={i}
              total={items.length}
              onReplace={() => setPickerOpen(i)}
              onMove={(dir) => move(i, dir)}
              onRemove={() => remove(i)}
            />
          ))}
        </Stack>
      )}
      <MediaPickerDialog
        open={pickerOpen !== null}
        onClose={() => setPickerOpen(null)}
        folder={folder}
        deviceOnly={deviceOnly}
        title={pickerOpen === 'new' ? `Add to ${label}` : `Replace image in ${label}`}
        onPicked={(url) => {
          if (pickerOpen === 'new') append(url);
          else if (typeof pickerOpen === 'number') setAt(pickerOpen, url);
        }}
      />
    </Box>
  );
}
