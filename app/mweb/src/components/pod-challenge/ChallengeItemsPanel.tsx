import { LinearProgress, List, ListItem, ListItemIcon, ListItemText, Stack, Typography } from '@mui/material';
import ChecklistIcon from '@mui/icons-material/Checklist';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { challengeItems, doneItemKeys } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import type { PanelProps } from './ChallengeToolPanels';
import ToolCard, { ToolNote } from './ToolCard';

/**
 * A Checklist or Checkpoint tool: how far every competitor has got, and — for
 * a competitor — their own list. Tasks are ticked by the host; a checkpoint is
 * reached by scanning the QR code posted at it.
 */
export default function ChallengeItemsPanel({ challenge, tool }: Readonly<Pick<PanelProps, 'challenge' | 'tool'>>) {
  const { t } = useTranslation();
  const items = challengeItems(tool);
  const mine = challenge.viewer.my_competitor_id;
  const myDone = new Set(mine ? doneItemKeys(tool, mine) : []);

  return (
    <ToolCard icon={<ChecklistIcon color="primary" />} title={tool.label}>
      {challenge.competitors.map((c) => {
        const done = doneItemKeys(tool, c.competitor_id).length;
        const label = t('mweb.challenge.tools.itemsProgress', { vars: { name: c.name, done, total: items.length } });
        return (
          <Stack key={c.competitor_id} spacing={0.5}>
            <Typography variant="body2">{label}</Typography>
            <LinearProgress variant="determinate" value={items.length ? (done * 100) / items.length : 0} aria-label={label} />
          </Stack>
        );
      })}
      {mine && (
        <List dense disablePadding aria-label={t('mweb.challenge.tools.itemsMine')}>
          {items.map((item) => (
            <ListItem key={item.key} disableGutters>
              <ListItemIcon sx={{ minWidth: 36 }}>
                {myDone.has(item.key) ? (
                  <CheckCircleIcon color="success" titleAccess={t('mweb.challenge.tools.itemDone')} />
                ) : (
                  <RadioButtonUncheckedIcon color="disabled" titleAccess={t('mweb.challenge.tools.itemPending')} />
                )}
              </ListItemIcon>
              <ListItemText primary={item.label} secondary={t('mweb.challenge.score', { vars: { score: item.points } })} />
            </ListItem>
          ))}
        </List>
      )}
      {mine && tool.input_kind === 'CHECKPOINT' && <ToolNote>{t('mweb.challenge.tools.checkpointHint')}</ToolNote>}
    </ToolCard>
  );
}
