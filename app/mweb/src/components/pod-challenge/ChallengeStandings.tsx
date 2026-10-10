import { Box, List, ListItem, Stack, Typography } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import type { PodChallengeStanding } from '@duncit/gql-types';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  standings: Pick<PodChallengeStanding, 'competitor_id' | 'name' | 'rank' | 'total'>[];
  /** Show only the first N rows (the live card's preview). */
  limit?: number;
  large?: boolean;
}

const MEDAL_COLOURS = ['warning.main', 'text.secondary', 'secondary.main'] as const;

/**
 * Ranked competitors exactly as the server ranked them (ties share a rank).
 * A list, not a table: on a phone it reads top to bottom, and a screen reader
 * announces "1 of 6" for free.
 */
export default function ChallengeStandings({ standings, limit, large }: Readonly<Props>) {
  const { t } = useTranslation();
  const rows = limit ? standings.slice(0, limit) : standings;
  if (!rows.length) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('mweb.challenge.noStandings')}
      </Typography>
    );
  }
  return (
    <List dense={!large} aria-label={t('mweb.challenge.standings')} disablePadding>
      {rows.map((s) => (
        <ListItem key={s.competitor_id} disableGutters divider>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', width: '100%' }}>
            <Box sx={{ width: large ? 48 : 32, textAlign: 'center', flexShrink: 0 }}>
              {s.rank <= 3 ? (
                <EmojiEventsIcon
                  sx={{ color: MEDAL_COLOURS[s.rank - 1], fontSize: large ? 36 : 22 }}
                  titleAccess={t('mweb.challenge.rank', { vars: { rank: s.rank } })}
                />
              ) : (
                <Typography variant={large ? 'h5' : 'body2'} component="span" sx={{ fontWeight: 700 }}>
                  {s.rank}
                </Typography>
              )}
            </Box>
            <Typography variant={large ? 'h5' : 'body2'} component="span" sx={{ flex: 1, fontWeight: s.rank === 1 ? 800 : 500 }} noWrap>
              {s.name}
            </Typography>
            <Typography
              variant={large ? 'h4' : 'body1'}
              component="span"
              sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}
              aria-label={t('mweb.challenge.score', { vars: { score: s.total } })}
            >
              {s.total}
            </Typography>
          </Stack>
        </ListItem>
      ))}
    </List>
  );
}
