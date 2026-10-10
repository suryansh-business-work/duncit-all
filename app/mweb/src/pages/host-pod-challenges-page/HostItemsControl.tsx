import { useState } from 'react';
import { Checkbox, FormControlLabel, FormGroup, Stack, Typography } from '@mui/material';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import { DuncitButton } from '@duncit/buttons';
import { fireAndForget, logs } from '@duncit/logs';
import { challengeItems, doneItemKeys, toolsFedBy } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import type { PodChallengeView } from '../../components/pod-challenge/queries';
import CheckpointLinksDialog from './CheckpointLinksDialog';
import type { HostChallengeActions } from './useHostChallengeActions';

interface Props {
  challenge: Pick<PodChallengeView, 'id' | 'tools' | 'competitors'>;
  actions: HostChallengeActions;
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
            {challenge.competitors.map((c) => {
              const done = new Set(doneItemKeys(tool, c.competitor_id));
              return (
                <Stack key={c.competitor_id} component="fieldset" sx={{ border: 0, p: 0, m: 0 }}>
                  <Typography variant="body2" component="legend" sx={{ fontWeight: 600 }}>
                    {c.name}
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
                            onChange={(_e, checked) =>
                              fireAndForget(actions.item(tool.instance_id, c.competitor_id, item.key, checked), logs.mWeb, 'host-pod-challenges', 'item')
                            }
                          />
                        }
                      />
                    ))}
                  </FormGroup>
                </Stack>
              );
            })}
          </Stack>
        );
      })}
      <CheckpointLinksDialog challengeId={challenge.id} toolInstanceId={qrFor} onClose={() => setQrFor(null)} />
    </>
  );
}
