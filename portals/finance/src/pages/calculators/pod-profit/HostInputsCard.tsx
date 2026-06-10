import { Card, CardContent, Stack, Typography } from '@mui/material';
import GroupIcon from '@mui/icons-material/Group';
import PercentSlider from './PercentSlider';
import type { PodProfitInputs } from './types';

interface Props {
  inputs: PodProfitInputs;
  onChange: <K extends keyof PodProfitInputs>(key: K, value: PodProfitInputs[K]) => void;
}

export default function HostInputsCard({ inputs, onChange }: Readonly<Props>) {
  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <GroupIcon color="primary" />
          <Typography variant="subtitle1" fontWeight={800}>Host split</Typography>
        </Stack>
        <Stack spacing={2}>
          <PercentSlider
            label="Host percentage"
            value={inputs.host_percent}
            onChange={(value) => onChange('host_percent', value)}
            hint="Slice of pod cost paid to the host before the platform's host-success cut."
          />
          <PercentSlider
            label="Host percentage — Duncit income"
            value={inputs.host_duncit_cut_percent}
            onChange={(value) => onChange('host_duncit_cut_percent', value)}
            max={50}
            hint="Cut Duncit takes from the host's share (e.g. host-success / payments fee)."
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
