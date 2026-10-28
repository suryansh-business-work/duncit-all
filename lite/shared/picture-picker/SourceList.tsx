import { ListItemButton, ListItemText, Stack } from '@mui/material';
import { useCommonT } from '../i18n';
import { FEATURED, PREVIOUS, type PictureSource } from './picture.types';

interface SourceListProps {
  /** Topics from the console; empty while stock photos are off. */
  topics: readonly string[];
  stockReady: boolean;
  selected: PictureSource;
  onSelect: (source: PictureSource) => void;
}

const sameSource = (a: PictureSource, b: PictureSource): boolean => a.kind === b.kind && (a.kind !== 'topic' || (b.kind === 'topic' && a.topic === b.topic));

/**
 * Where to look: Pexels' picks, the host's earlier covers, then each topic.
 * A column beside the results on a wide screen; a scrolling row above them on a phone.
 */
export function SourceList({ topics, stockReady, selected, onSelect }: Readonly<SourceListProps>) {
  const { t } = useCommonT();
  const entries: { key: string; label: string; source: PictureSource }[] = [
    ...(stockReady ? [{ key: 'featured', label: t('lite.picture.featured'), source: FEATURED }] : []),
    { key: 'previous', label: t('lite.picture.previous'), source: PREVIOUS },
    ...(stockReady ? topics.map((topic) => ({ key: `topic-${topic}`, label: topic, source: { kind: 'topic', topic } as const })) : []),
  ];
  return (
    <Stack
      role="group"
      aria-label={t('lite.picture.sources')}
      data-testid="picture-sources"
      sx={{
        flexDirection: { xs: 'row', md: 'column' },
        gap: 0.5,
        flexShrink: 0,
        width: { md: 200 },
        overflowX: { xs: 'auto', md: 'hidden' },
        overflowY: { md: 'auto' },
        pb: { xs: 0.5, md: 0 },
      }}
    >
      {entries.map((entry) => {
        const active = sameSource(entry.source, selected);
        return (
          <ListItemButton
            key={entry.key}
            selected={active}
            aria-pressed={active}
            onClick={() => onSelect(entry.source)}
            data-testid={`picture-source-${entry.key}`}
            sx={{ flex: 'none', borderRadius: 2, py: 0.5 }}
          >
            <ListItemText primary={entry.label} slotProps={{ primary: { variant: 'body2', noWrap: true, sx: { fontWeight: active ? 700 : 400 } } }} />
          </ListItemButton>
        );
      })}
    </Stack>
  );
}
