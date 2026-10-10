import { Box, Stack, Typography } from '@mui/material';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitIconButton } from '@duncit/buttons';
import { videoSourceUrl, type ChallengeEntry } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import { ToolNote } from './ToolCard';

interface Props {
  entries: ChallengeEntry[];
  /** competitor_id → name. */
  names: ReadonlyMap<string, string>;
  /** Whether this viewer may remove the entry (the server decides again). */
  canRemove: (entry: ChallengeEntry) => boolean;
  onRemove: (entry: ChallengeEntry) => void;
  busy: boolean;
}

const MEDIA_SX = { width: '100%', maxHeight: 280, borderRadius: 1, display: 'block', bgcolor: 'action.hover' } as const;

function EntryMedia({ entry, label }: Readonly<{ entry: ChallengeEntry; label: string }>) {
  if (entry.media_type === 'IMAGE') {
    return <Box component="img" src={entry.media_url} alt={label} loading="lazy" sx={{ ...MEDIA_SX, objectFit: 'contain' }} />;
  }
  if (entry.media_type === 'VIDEO') {
    return <Box component="video" src={videoSourceUrl(entry.media_url)} controls playsInline preload="metadata" aria-label={label} sx={MEDIA_SX} />;
  }
  return <Box component="audio" src={entry.media_url} controls preload="metadata" aria-label={label} sx={{ width: '100%' }} />;
}

/** A Submission tool's entries: one piece per competitor, with who it is by. */
export default function ChallengeGallery({ entries, names, canRemove, onRemove, busy }: Readonly<Props>) {
  const { t } = useTranslation();
  if (!entries.length) return <ToolNote>{t('mweb.challenge.tools.noSubmissions')}</ToolNote>;
  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' } }}>
      {entries.map((entry) => {
        const name = names.get(entry.competitor_id) ?? '';
        return (
          <Stack key={entry.id} spacing={0.5} component="figure" sx={{ m: 0 }}>
            <EntryMedia entry={entry} label={t('mweb.challenge.tools.entryBy', { vars: { name } })} />
            <Stack direction="row" spacing={1} component="figcaption" sx={{ alignItems: 'center' }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {name}
                </Typography>
                {entry.caption && (
                  <Typography variant="body2" sx={{ color: 'text.secondary', overflowWrap: 'anywhere' }}>
                    {entry.caption}
                  </Typography>
                )}
              </Box>
              {canRemove(entry) && (
                <DuncitIconButton
                  size="small"
                  aria-label={t('mweb.challenge.tools.removeEntry', { vars: { name } })}
                  disabled={busy}
                  onClick={() => onRemove(entry)}
                >
                  <DeleteOutlinedIcon fontSize="small" />
                </DuncitIconButton>
              )}
            </Stack>
          </Stack>
        );
      })}
    </Box>
  );
}
