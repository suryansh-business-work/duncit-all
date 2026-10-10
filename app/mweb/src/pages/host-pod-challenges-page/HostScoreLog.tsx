import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { IconButton, List, ListItem, ListItemText, Tooltip, Typography } from '@mui/material';
import UndoIcon from '@mui/icons-material/Undo';
import { logs } from '@duncit/logs';
import { useTranslation } from '../../i18n/useTranslation';
import { useDateFormat } from '../../utils/dateFormat';
import type { PodChallengeView } from '../../components/pod-challenge/queries';
import { ReasonDialog } from './reason-form';
import { POD_CHALLENGE_SCORE_LOG, type ScoreEntry } from './queries';
import type { HostChallengeActions } from './useHostChallengeActions';

interface Props {
  challenge: Pick<PodChallengeView, 'id' | 'status' | 'revision' | 'tools' | 'competitors'>;
  actions: HostChallengeActions;
}

/**
 * The latest score entries, newest first, each removable. Scores are never
 * edited: removing one voids it (kept on file with who and why). After the
 * challenge ends a removal is a correction and needs a reason.
 */
export default function HostScoreLog({ challenge, actions }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const { data, refetch } = useQuery(POD_CHALLENGE_SCORE_LOG, { variables: { id: challenge.id }, fetchPolicy: 'cache-and-network' });
  // Another device (a co-host, Challenge staff) may have scored: follow the revision.
  useEffect(() => {
    refetch().catch((error: unknown) => logs.mWeb.warn('host-pod-challenges', 'scoreLog', { error }));
  }, [challenge.revision, refetch]);
  const [voiding, setVoiding] = useState<ScoreEntry | null>(null);
  const toolLabel = new Map(challenge.tools.map((tool) => [tool.instance_id, tool.label]));
  const name = new Map(challenge.competitors.map((c) => [c.competitor_id, c.name]));
  const entries = data?.podChallengeScoreLog ?? [];
  const correcting = challenge.status !== 'LIVE';

  if (!entries.length) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('mweb.challenge.noScores')}
      </Typography>
    );
  }
  return (
    <>
      <List dense aria-label={t('mweb.challenge.scoreLog')}>
        {entries.map((e) => {
          const label = t('mweb.challenge.logEntry', {
            vars: { name: name.get(e.competitor_id) ?? '—', tool: toolLabel.get(e.tool_instance_id) ?? '—', value: e.value },
          });
          return (
            <ListItem
              key={e.id}
              divider
              secondaryAction={
                !e.voided && (
                  <Tooltip title={t('mweb.challenge.removeScore')}>
                    <IconButton edge="end" aria-label={`${t('mweb.challenge.removeScore')}: ${label}`} onClick={() => setVoiding(e)} disabled={actions.scoring}>
                      <UndoIcon />
                    </IconButton>
                  </Tooltip>
                )
              }
            >
              <ListItemText
                primary={label}
                secondary={e.voided ? t('mweb.challenge.removed', { vars: { reason: e.void_reason || '—' } }) : formatDateTime(e.created_at)}
                slotProps={{ primary: { sx: { textDecoration: e.voided ? 'line-through' : 'none' } } }}
              />
            </ListItem>
          );
        })}
      </List>
      <ReasonDialog
        open={!!voiding}
        title={t('mweb.challenge.removeScoreTitle')}
        message={t(correcting ? 'mweb.challenge.removeScoreCorrection' : 'mweb.challenge.removeScoreBody')}
        confirmLabel={t('mweb.challenge.removeScore')}
        required={correcting}
        saving={actions.scoring}
        onClose={() => setVoiding(null)}
        onSubmit={async ({ reason }) => {
          if (voiding && (await actions.voidScore(voiding.id, reason || undefined))) setVoiding(null);
        }}
      />
    </>
  );
}
