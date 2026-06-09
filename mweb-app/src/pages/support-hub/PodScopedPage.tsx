import { ReactNode } from 'react';
import { Stack } from '@mui/material';
import SupportShell from './SupportShell';
import PodPicker from './PodPicker';
import { usePodPicker } from './usePodPicker';
import type { SupportPodOption } from './queries';

interface Props {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  gradient?: string;
  children: (selected: SupportPodOption | null) => ReactNode;
}

export default function PodScopedPage({ title, subtitle, icon, gradient, children }: Readonly<Props>) {
  const { options, selected, selectedId, setSelectedId, loading } = usePodPicker();

  return (
    <SupportShell title={title} subtitle={subtitle} icon={icon} gradient={gradient} backTo="/support">
      <Stack spacing={2}>
        <PodPicker
          options={options}
          selectedId={selectedId}
          onChange={setSelectedId}
          loading={loading}
        />
        {children(selected)}
      </Stack>
    </SupportShell>
  );
}
