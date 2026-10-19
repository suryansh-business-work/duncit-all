import { useState } from 'react';
import { Checkbox, FormControlLabel, FormGroup, Stack, Typography } from '@mui/material';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import { DuncitButton } from '@duncit/buttons';
import { fireAndForget, logs } from '@duncit/logs';
import { challengeItems, doneItemKeys, toolsFedBy, type ChallengeItem } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import type { PodChallengeView } from '../../components/pod-challenge/queries';
import CheckpointLinksDialog from './CheckpointLinksDialog';
import type { HostChallengeActions } from './useHostChallengeActions';

interface Props {
  challenge: Pick<PodChallengeView, 'id' | 'tools' | 'competitors'>;
  actions: HostChallengeActions;
}

interface CompetitorItemsProps {
  tool: PodChallengeView['tools'][number];
  competitor: PodChallengeView['competitors'][number];
  items: ChallengeItem[];
  actions: HostChallengeActions;
}

/** One competitor's tasks or checkpoints, each a checkbox the host ticks. */
function CompetitorItems({ tool, competitor, items, actions }: Readonly<CompetitorItemsProps>) {
  const done = new Set(doneItemKeys(tool, competitor.competitor_id));
  const tick = (key: string, checked: boolean) =>
    fireAndForget(
      actions.item(tool.instance_id, competitor.competitor_id, key, checked),
      logs.mWeb,
      'host-pod-challenges',
      'item'
    );
  return (
    <Stack component="fieldset" sx={{ border: 0, p: 0, m: 0 }}>
      <Typography variant="body2" component="legend" sx={{ fontWeight: 600 }}>
        {competitor.name}
      </Typography>
      <FormGroup row>
        {items.map((item) => (
          <FormControlLabel
            key={item.key}
            label={item.label}
            control={
              <Checkbox
                size="small"
                checked={done.has(item.key)}
                disabled={actions.scoring}
                onChange={(_e, checked) => tick(item.key, checked)}
              />
            }
          />
        ))}
      </FormGroup>
    </Stack>
  );
}

/**
 * Ticking tasks and checkpoints for each competitor. A checkpoint can also be
 * reached by the competitor scanning its QR code — the codes are behind the
 * button, and only a host can fetch them.
 */
export default function HostItemsControl({ challenge, actions }: Readonly<Props>) {
  const { t } = useTranslation();
  const [qrFor, setQrFor] = useState<string | null>(null);

  return (
    <>
      {toolsFedBy(challenge.tools, 'CHECK', 'CHECKPOINT').map((tool) => {
        const items = challengeItems(tool);
        return (
          <Stack key={tool.instance_id} spacing={1} component="section" aria-label={tool.label}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Typography variant="subtitle2" component="h4" sx={{ flex: 1 }}>
                {tool.label}
              </Typography>
              {tool.input_kind === 'CHECKPOINT' && (
                <DuncitButton size="small" startIcon={<QrCode2Icon />} onClick={() => setQrFor(tool.instance_id)}>
                  {t('mweb.challenge.tools.checkpointQr')}
                </DuncitButton>
              )}
            </Stack>
            {challenge.competitors.map((c) => (
              <CompetitorItems key={c.competitor_id} tool={tool} competitor={c} items={items} actions={actions} />
            ))}
          </Stack>
        );
      })}
      <CheckpointLinksDialog challengeId={challenge.id} toolInstanceId={qrFor} onClose={() => setQrFor(null)} />
    </>
  );
}
