import { useId } from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { LeadQualityDetails } from '../../api/leadQuality.gql';
import { GATE_COLOR, GATE_KEY, keyOr } from '../lead-quality/qualityLabels';

type Gate = NonNullable<LeadQualityDetails['result']>['gates'][number];

/** The mandatory gates a lead must pass to qualify, each with its Passed / Failed / To verify state. */
export default function QualityGates({ gates }: Readonly<{ gates: readonly Gate[] }>) {
  const { t } = useTranslation();
  const titleId = useId();
  return (
    <Box component="section" aria-labelledby={titleId} sx={{ mt: 2 }}>
      <Typography id={titleId} component="h3" variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
        {t('crm.leadQualityTab.gatesTitle')}
      </Typography>
      {gates.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('crm.leadQualityTab.noGates')}
        </Typography>
      ) : (
        <Stack component="ul" direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', listStyle: 'none', m: 0, p: 0 }}>
          {gates.map((gate) => (
            <li key={gate.key}>
              <Chip
                size="small"
                variant="outlined"
                color={GATE_COLOR[gate.state] ?? 'default'}
                label={t('crm.leadQualityTab.gateChip', {
                  vars: { name: gate.name, state: t(keyOr(GATE_KEY, gate.state, 'crm.leadQuality.gatePending')) },
                })}
                data-testid={`lead-quality-gate-${gate.key}`}
              />
            </li>
          ))}
        </Stack>
      )}
    </Box>
  );
}
