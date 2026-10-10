import { List, ListItem, Typography } from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { DuncitButton } from '@duncit/buttons';
import { fireAndForget, logs } from '@duncit/logs';
import { buzzOrder, buzzRoundScope } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import type { PanelProps } from './ChallengeToolPanels';
import ToolCard, { ToolNote } from './ToolCard';

/**
 * The buzzer. A competitor's press is timed by the server, so a slow phone or
 * a wrong clock cannot jump the queue; the order below is the server's.
 */
export default function ChallengeBuzzerPanel({ challenge, tool, actions, interactive }: Readonly<PanelProps>) {
  const { t } = useTranslation();
  const names = new Map(challenge.competitors.map((c) => [c.competitor_id, c.name]));
  const order = buzzOrder(tool);
  const scope = buzzRoundScope(tool);
  const buzzed = challenge.viewer.my_votes.some(
    (v) => v.tool_instance_id === tool.instance_id && v.kind === 'BUZZ' && v.scope_key === scope
  );
  const competing = !!challenge.viewer.my_competitor_id;

  return (
    <ToolCard icon={<NotificationsActiveIcon color="primary" />} title={tool.label}>
      <ToolNote>{t(tool.voting_open ? 'mweb.challenge.tools.buzzArmed' : 'mweb.challenge.tools.buzzWaiting')}</ToolNote>
      {interactive && competing && (
        <DuncitButton
          size="large"
          variant="contained"
          color="error"
          disabled={!tool.voting_open || buzzed || actions.busy}
          onClick={() => fireAndForget(actions.buzz(tool.instance_id), logs.mWeb, 'pod-challenge', 'buzz')}
          sx={{ py: 2, fontWeight: 800 }}
        >
          {t(buzzed ? 'mweb.challenge.tools.buzzed' : 'mweb.challenge.tools.buzz')}
        </DuncitButton>
      )}
      {interactive && !competing && <ToolNote>{t('mweb.challenge.tools.competitorsOnly')}</ToolNote>}
      {order.length > 0 ? (
        <List dense disablePadding component="ol" aria-label={t('mweb.challenge.tools.buzzOrder')} aria-live="polite">
          {order.map((competitorId, index) => (
            <ListItem key={competitorId} disableGutters>
              <Typography variant="body1" sx={{ fontWeight: index === 0 ? 800 : 400 }}>
                {t('mweb.challenge.tools.place', { vars: { place: index + 1, name: names.get(competitorId) ?? '' } })}
              </Typography>
            </ListItem>
          ))}
        </List>
      ) : (
        <ToolNote>{t('mweb.challenge.tools.buzzNobody')}</ToolNote>
      )}
    </ToolCard>
  );
}
