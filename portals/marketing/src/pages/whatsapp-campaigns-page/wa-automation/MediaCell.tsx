import { Button, Stack, Tooltip, Typography } from '@mui/material';
import { StatusChip } from '@duncit/ui';
import { MEDIA_STATE_COLORS, mediaStateFor, type MediaState } from './helpers';
import type { WaScenario } from './queries';

interface MediaCellProps {
  row: WaScenario;
  /** One localized label per state, computed once by the column builder. */
  stateLabels: Readonly<Record<MediaState, string>>;
  setLabel: string;
  onOpen: (row: WaScenario) => void;
}

/**
 * Which header asset a send would actually carry, and the way in to change it.
 *
 * The action only shows where an asset can matter — the template's header is
 * media, or an old override survives one that no longer is — so a TEXT-header
 * row stays a quiet caption rather than an invitation to attach something
 * AiSensy would refuse.
 */
export function MediaCell({ row, stateLabels, setLabel, onOpen }: Readonly<MediaCellProps>) {
  const state = mediaStateFor(row);
  // The URL actually in play, readable without opening the dialog.
  const effectiveUrl = row.override_media_url || row.media_url;
  return (
    <Stack spacing={0.25} alignItems="flex-start" sx={{ py: 0.5 }}>
      {state === 'NOT_NEEDED' ? (
        <Typography variant="caption" color="text.secondary">
          {stateLabels.NOT_NEEDED}
        </Typography>
      ) : (
        <Tooltip title={effectiveUrl}>
          <StatusChip status={state} label={stateLabels[state]} colorMap={MEDIA_STATE_COLORS} />
        </Tooltip>
      )}
      {(row.needs_media || Boolean(row.override_media_url)) && (
        <Button
          size="small"
          sx={{ minWidth: 0, px: 0.5, fontSize: 12, textTransform: 'none' }}
          onClick={() => onOpen(row)}
        >
          {setLabel}
        </Button>
      )}
    </Stack>
  );
}
