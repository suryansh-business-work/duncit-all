import { Avatar, Box, Chip, Stack, Typography } from '@mui/material';
import { audienceOptions, platformOptions } from '../app-popup-form';
import type { AppPopupRow } from '../queries';
import type { useTranslation } from '@duncit/app-settings';

export type Translate = ReturnType<typeof useTranslation>['t'];

export const getRowId = (popup: AppPopupRow) => popup.id;

export const platformLabels = (t: Translate) =>
  new Map(platformOptions(t).map((o) => [o.value as string, o.label]));
export const selectPlatforms = (t: Translate) =>
  platformOptions(t).map((o) => ({ value: o.value, label: o.label }));
export const selectAudiences = (t: Translate) =>
  audienceOptions(t).map((o) => ({ value: o.value, label: o.label }));

/**
 * Live means enabled AND inside its window right now — the same two conditions
 * the app-open read applies, so what this column says is what a phone gets.
 */
const isLive = (popup: AppPopupRow) => {
  const now = Date.now();
  return (
    popup.enabled &&
    new Date(popup.start_at).getTime() <= now &&
    new Date(popup.end_at).getTime() >= now
  );
};

export const statusOf = (popup: AppPopupRow) => {
  if (!popup.enabled) return 'Disabled';
  if (isLive(popup)) return 'Live';
  if (new Date(popup.start_at).getTime() > Date.now()) return 'Scheduled';
  return 'Ended';
};

const STATUS_COLORS: Record<string, 'success' | 'info' | 'default'> = {
  Live: 'success',
  Scheduled: 'info',
};

export const renderName = (popup: AppPopupRow) => (
  <Stack direction="row" spacing={1} sx={{
    alignItems: "center"
  }}>
    <Avatar alt="" src={popup.image_url} variant="rounded" sx={{ width: 40, height: 40 }} />
    <Box sx={{ lineHeight: 1.2 }}>
      <Typography variant="body2" component="div" sx={{
        fontWeight: 600
      }}>
        {popup.name}
      </Typography>
      {popup.cta_url && (
        <Typography
          variant="caption"
          component="div"
          sx={{
            color: "text.secondary",
            wordBreak: 'break-all'
          }}>
          → {popup.cta_label}: {popup.cta_url}
        </Typography>
      )}
    </Box>
  </Stack>
);

export const renderStatus = (popup: AppPopupRow) => {
  const status = statusOf(popup);
  return <Chip size="small" label={status} color={STATUS_COLORS[status] ?? 'default'} />;
};

export const renderPlatform = (popup: AppPopupRow, t: Translate) => (
  <Chip
    size="small"
    variant="outlined"
    label={platformLabels(t).get(popup.platform)}
  />
);
