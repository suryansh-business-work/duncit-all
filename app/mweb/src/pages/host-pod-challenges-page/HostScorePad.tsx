import { useState } from 'react';
import { Divider, Stack, TextField, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { fireAndForget, logs } from '@duncit/logs';
import { parseJsonObject } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import type { PodChallengeView } from '../../components/pod-challenge/queries';
import type { HostChallengeActions } from './useHostChallengeActions';


type Tool = PodChallengeView['tools'][number];

interface Props {
  challenge: Pick<PodChallengeView, 'tools' | 'competitors' | 'standings'>;
  actions: HostChallengeActions;
}

function ValueEntry({ label, onRecord, disabled }: Readonly<{ label: string; onRecord: (v: number) => void; disabled: boolean }>) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const value = Number(text);
  const valid = text !== '' && Number.isFinite(value) && value >= 0;
  return (
    <Stack direction="row" spacing={1}>
      <TextField size="small" type="number" label={label} value={text} onChange={(e) => setText(e.target.value)} slotProps={{ htmlInput: { min: 0, step: 'any' } }} sx={{ width: 140 }} />
      <DuncitButton size="small" variant="outlined" disabled={disabled || !valid} onClick={() => { onRecord(value); setText(''); }}>
        {t('mweb.challenge.record')}
      </DuncitButton>
    </Stack>
  );
}

/** Live score entry: one row per competitor for every tool the host scores by hand. */
export default function HostScorePad({ challenge, actions }: Readonly<Props>) {
  const { t } = useTranslation();
  const metrics = new Map(challenge.standings.map((s) => [s.competitor_id, parseJsonObject(s.metrics_json)]));
  // The server says how each tool is fed; a clock also takes per-competitor
  // times when its settings record them.
  const scorable = challenge.tools.filter(
    (tool) =>
      tool.input_kind === 'INCREMENT' ||
      tool.input_kind === 'SET_VALUE' ||
      (tool.input_kind === 'CLOCK' && parseJsonObject(tool.config_json).record_competitor_times === true)
  );
  const record = (tool: Tool, competitorId: string, value: number) =>
    fireAndForget(actions.score(tool.instance_id, competitorId, value), logs.mWeb, 'host-pod-challenges', 'score');

  if (!scorable.length) return null;
  return (
    <Stack spacing={2} divider={<Divider flexItem />}>
      {scorable.map((tool) => {
        const config = parseJsonObject(tool.config_json);
        const steps = ((config.increments as number[] | undefined) ?? []).flatMap((s) => (config.allow_negative ? [s, -s] : [s]));
        return (
          <Stack key={tool.instance_id} spacing={1} component="section" aria-label={tool.label}>
            <Typography variant="subtitle2" component="h4">
              {tool.label}
            </Typography>
            {challenge.competitors.map((c) => (
              <Stack key={c.competitor_id} direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
                <Typography variant="body2" sx={{ flex: 1, fontWeight: 600 }}>
                  {c.name} · {String(metrics.get(c.competitor_id)?.[tool.instance_id] ?? '—')}
                </Typography>
                {tool.input_kind === 'INCREMENT' ? (
                  <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
                    {steps.map((step) => (
                      <DuncitButton
                        key={step}
                        size="small"
                        variant={step > 0 ? 'contained' : 'outlined'}
                        disabled={actions.scoring}
                        aria-label={t('mweb.challenge.addPoints', { vars: { points: step, name: c.name } })}
                        onClick={() => record(tool, c.competitor_id, step)}
                      >
                        {step > 0 ? `+${step}` : String(step)}
                      </DuncitButton>
                    ))}
                  </Stack>
                ) : (
                  <ValueEntry label={tool.label} disabled={actions.scoring} onRecord={(v) => record(tool, c.competitor_id, v)} />
                )}
              </Stack>
            ))}
          </Stack>
        );
      })}
    </Stack>
  );
}
