import { List, ListItem, Stack, Typography } from '@mui/material';
import CasinoIcon from '@mui/icons-material/Casino';
import { pickedCompetitors } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import type { PanelProps } from './ChallengeToolPanels';
import ToolCard, { ToolNote } from './ToolCard';

/** The Random Picker's draws. The server draws; every screen shows the same pick. */
export default function ChallengePickPanel({ challenge, tool }: Readonly<Pick<PanelProps, 'challenge' | 'tool'>>) {
  const { t } = useTranslation();
  const names = new Map(challenge.competitors.map((c) => [c.competitor_id, c.name]));
  // Numbered in draw order: the same competitor can be drawn twice, and the
  // number is what tells the two draws apart.
  const draws = pickedCompetitors(tool).map((id, index) => ({ place: index + 1, name: names.get(id) ?? '' }));
  const latest = draws.at(-1);
  const earlier = draws.slice(0, -1);

  return (
    <ToolCard icon={<CasinoIcon color="primary" />} title={tool.label}>
      {latest ? (
        <Typography variant="h5" component="p" role="status" aria-live="polite" sx={{ fontWeight: 800 }}>
          {t('mweb.challenge.tools.pickLatest', { vars: { name: latest.name } })}
        </Typography>
      ) : (
        <ToolNote>{t('mweb.challenge.tools.pickNone')}</ToolNote>
      )}
      {earlier.length > 0 && (
        <Stack spacing={0.5}>
          <ToolNote>{t('mweb.challenge.tools.pickEarlier')}</ToolNote>
          <List dense disablePadding component="ol">
            {earlier.map((draw) => (
              <ListItem key={draw.place} disableGutters>
                <Typography variant="body2">{t('mweb.challenge.tools.place', { vars: draw })}</Typography>
              </ListItem>
            ))}
          </List>
        </Stack>
      )}
    </ToolCard>
  );
}
